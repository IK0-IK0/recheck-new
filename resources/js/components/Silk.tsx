import { Canvas, useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

const vertexShader = `
    varying vec2 vUv;

    void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
    }
`;

const fragmentShader = `
    precision highp float;

    uniform float uTime;
    uniform float uSpeed;
    uniform float uScale;
    uniform vec3 uColor;
    uniform float uNoiseIntensity;
    uniform float uRotation;
    varying vec2 vUv;

    mat2 rotate2d(float angle) {
        float s = sin(angle);
        float c = cos(angle);
        return mat2(c, -s, s, c);
    }

    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
            mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
            f.y
        );
    }

    void main() {
        vec2 uv = vUv - 0.5;
        uv.x *= 1.7777;
        uv = rotate2d(uRotation) * uv;

        float time = uTime * uSpeed * 0.08;
        vec2 flow = uv * (2.0 + uScale * 1.5);
        flow.x += sin(flow.y * 2.7 + time) * 0.45;
        flow.y += cos(flow.x * 2.1 - time * 0.8) * 0.35;

        float silk = sin(flow.x * 4.0 + sin(flow.y * 3.0 + time) * 1.8 + time);
        silk += sin(flow.y * 5.0 - time * 0.7) * 0.45;
        silk = smoothstep(-1.1, 1.4, silk * 0.5);

        float grain = noise(flow * 3.0 + time * 0.15) - 0.5;
        float vignette = 1.0 - smoothstep(0.25, 0.85, length(uv));
        float brightness = mix(0.12, 0.72, silk) + grain * uNoiseIntensity * 0.1;
        vec3 color = uColor * brightness * (0.68 + vignette * 0.36);

        gl_FragColor = vec4(color, 1.0);
    }
`;

type SilkProps = {
    speed?: number;
    scale?: number;
    color?: string;
    noiseIntensity?: number;
    rotation?: number;
    className?: string;
};

function SilkPlane({ speed, scale, color, noiseIntensity, rotation }: Required<Omit<SilkProps, 'className'>>) {
    const material = useRef<THREE.ShaderMaterial>(null);

    useFrame(({ clock }) => {
        if (material.current) {
            material.current.uniforms.uTime.value = clock.getElapsedTime();
        }
    });

    return (
        <mesh>
            <planeGeometry args={[2, 2]} />
            <shaderMaterial
                ref={material}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={{
                    uTime: { value: 0 },
                    uSpeed: { value: speed },
                    uScale: { value: scale },
                    uColor: { value: new THREE.Color(color) },
                    uNoiseIntensity: { value: noiseIntensity },
                    uRotation: { value: rotation },
                }}
            />
        </mesh>
    );
}

export default function Silk({
    speed = 5,
    scale = 1,
    color = '#5227FF',
    noiseIntensity = 1.5,
    rotation = 0,
    className,
}: SilkProps) {
    return (
        <div className={className} aria-hidden="true">
            <Canvas orthographic camera={{ position: [0, 0, 1], zoom: 1 }} gl={{ antialias: true }}>
                <SilkPlane
                    speed={speed}
                    scale={scale}
                    color={color}
                    noiseIntensity={noiseIntensity}
                    rotation={rotation}
                />
            </Canvas>
        </div>
    );
}
