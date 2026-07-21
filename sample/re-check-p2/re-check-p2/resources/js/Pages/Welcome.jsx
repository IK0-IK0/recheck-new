'use client';

import { Head, Link } from '@inertiajs/react';
import { ChevronRight, CheckCircle, Zap, Lock, Users, TrendingUp, Star, Mail, Linkedin, Twitter, ArrowRight, Menu, X, ArrowUp } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Welcome({ auth }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);

    // Handle scroll-to-top button visibility
    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 300);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const scrollToSection = (id) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
            setMobileMenuOpen(false);
        }
    };

    const features = [
        {
            icon: <Zap className="w-6 h-6" />,
            title: "Lightning Fast",
            description: "Instant verification with real-time processing. Get results in seconds, not hours."
        },
        {
            icon: <CheckCircle className="w-6 h-6" />,
            title: "99.9% Accuracy",
            description: "AI-powered algorithms ensure comprehensive checks with minimal false positives."
        },
        {
            icon: <Lock className="w-6 h-6" />,
            title: "Enterprise Security",
            description: "Bank-level encryption and compliance with GDPR, HIPAA, and SOC 2 standards."
        }
    ];

    const testimonials = [
        {
            name: "Sarah Chen",
            role: "Research Lead, MIT",
            quote: "RECheck has reduced our ethics review time by 60%. Absolutely game-changing.",
            avatar: "SC"
        },
        {
            name: "Dr. James Wilson",
            role: "Ethics Director, Stanford",
            quote: "The compliance features are comprehensive. Our team loves the ease of use.",
            avatar: "JW"
        },
        {
            name: "Emma Rodriguez",
            role: "Project Manager, Harvard",
            quote: "Finally, a tool designed for modern research workflows. Highly recommended.",
            avatar: "ER"
        },
        {
            name: "Michael Park",
            role: "CTO, Tech Institute",
            quote: "Integration was seamless. The team behind RECheck is exceptional.",
            avatar: "MP"
        }
    ];

    const stats = [
        { number: "50K+", label: "Checks Processed" },
        { number: "98%", label: "Accuracy Rate" },
        { number: "2min", label: "Avg Processing Time" }
    ];

    return (
        <>
            <Head title="RECheck - Verify Everything Instantly" />
            <div className="min-h-screen overflow-hidden bg-background text-foreground">
                {/* Fixed Navbar */}
                <nav className="fixed inset-x-0 top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border shadow-sm">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-3 md:py-4">
                        <div className="flex items-center justify-between">
                            {/* Logo */}
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                                    <CheckCircle className="w-5 h-5 text-primary-foreground" />
                                </div>
                                <h1 className="text-lg md:text-xl font-bold text-foreground">RECheck</h1>
                            </div>

                            {/* Desktop Navigation */}
                            <div className="hidden md:flex items-center gap-6">
                                <button
                                    onClick={() => scrollToSection('home')}
                                    className="text-sm font-medium text-muted-foreground hover:text-primary transition"
                                >
                                    Home
                                </button>
                                <button
                                    onClick={() => scrollToSection('about')}
                                    className="text-sm font-medium text-muted-foreground hover:text-primary transition"
                                >
                                    About
                                </button>
                                <button
                                    onClick={() => scrollToSection('testimonials')}
                                    className="text-sm font-medium text-muted-foreground hover:text-primary transition"
                                >
                                    Testimonials
                                </button>
                                <button
                                    onClick={() => scrollToSection('contact')}
                                    className="text-sm font-medium text-muted-foreground hover:text-primary transition"
                                >
                                    Contact
                                </button>
                            </div>

                            {/* Auth Buttons Desktop */}
                            <div className="hidden md:flex items-center gap-3">
                                {auth.user ? (
                                    <Link
                                        href={route('dashboard')}
                                        className="px-4 py-2 rounded-lg font-medium text-primary-foreground bg-primary hover:bg-primary/90 transition text-sm"
                                    >
                                        Dashboard
                                    </Link>
                                ) : (
                                    <>
                                        <Link
                                            href={route('login')}
                                            className="px-4 py-2 rounded-lg font-medium text-foreground hover:text-primary transition text-sm"
                                        >
                                            Log in
                                        </Link>
                                        <Link
                                            href={route('register')}
                                            className="px-4 py-2 rounded-lg font-medium text-primary-foreground bg-primary hover:bg-primary/90 transition text-sm"
                                        >
                                            Sign up
                                        </Link>
                                    </>
                                )}
                            </div>

                            {/* Mobile Menu Button */}
                            <button
                                className="md:hidden p-2"
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                aria-label="Toggle menu"
                            >
                                {mobileMenuOpen ? (
                                    <X className="w-5 h-5" />
                                ) : (
                                    <Menu className="w-5 h-5" />
                                )}
                            </button>
                        </div>

                        {/* Mobile Menu Sheet */}
                        {mobileMenuOpen && (
                            <div className="mt-4 pt-4 border-t border-border flex flex-col gap-3 pb-4">
                                <button
                                    onClick={() => scrollToSection('home')}
                                    className="text-sm font-medium text-muted-foreground hover:text-primary transition text-left py-2"
                                >
                                    Home
                                </button>
                                <button
                                    onClick={() => scrollToSection('about')}
                                    className="text-sm font-medium text-muted-foreground hover:text-primary transition text-left py-2"
                                >
                                    About
                                </button>
                                <button
                                    onClick={() => scrollToSection('testimonials')}
                                    className="text-sm font-medium text-muted-foreground hover:text-primary transition text-left py-2"
                                >
                                    Testimonials
                                </button>
                                <button
                                    onClick={() => scrollToSection('contact')}
                                    className="text-sm font-medium text-muted-foreground hover:text-primary transition text-left py-2"
                                >
                                    Contact
                                </button>
                                {auth.user ? (
                                    <div className="flex gap-3 mt-2 pt-2 border-t border-border">
                                        <Link
                                            href={route('dashboard')}
                                            className="flex-1 px-3 py-2 rounded-lg text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 transition text-center"
                                        >
                                            Dashboard
                                        </Link>
                                        <Link
                                            href={route('logout')}
                                            method="post"
                                            as="button"
                                            className="flex-1 px-3 py-2 rounded-lg text-sm font-medium text-primary border border-primary hover:bg-accent hover:text-accent-foreground transition text-center"
                                        >
                                            Logout
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="flex gap-3 mt-2 pt-2 border-t border-border">
                                        <Link
                                            href={route('login')}
                                            className="flex-1 px-3 py-2 rounded-lg text-sm font-medium text-primary border border-primary hover:bg-accent hover:text-accent-foreground transition text-center"
                                        >
                                            Log in
                                        </Link>
                                        <Link
                                            href={route('register')}
                                            className="flex-1 px-3 py-2 rounded-lg text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 transition text-center"
                                        >
                                            Sign up
                                        </Link>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </nav>

                {/* Main Content with Snap Scroll Container - snap-center for perfect centering */}
                {/* scroll-snap-type: y proximity; scroll-behavior: smooth; No bleed with scroll-padding-top: 0 */}
                <main className="h-screen overflow-x-hidden overflow-y-scroll snap-y scrollbar-thin scrollbar-thumb-ring/20 scrollbar-track-transparent pt-16" style={{
                    scrollPaddingTop: '0',
                    scrollBehavior: 'smooth',
                    scrollSnapType: 'y proximity' // Changed from mandatory to proximity for slower, softer snapping
                }}>

                    {/* Home Section (snap-center: perfect viewport center) */}
                    <section id="home" className="h-screen w-screen snap-center flex items-center justify-center py-12 md:py-16 px-4 sm:px-6 md:px-8 relative">
                        {/* Background Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/20 -z-10" />

                        <div className="max-w-4xl mx-auto w-full text-center space-y-6">
                            {/* Badge */}
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                                <TrendingUp className="w-4 h-4 text-primary flex-shrink-0" />
                                <span className="text-sm font-medium text-primary">Launch Your Verification Platform</span>
                            </div>

                            {/* Headline */}
                            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
                                Verify everything
                                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary to-accent">
                                    instantly
                                </span>
                            </h1>

                            {/* Subheading */}
                            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                                Fast, secure checks for your data needs. Enterprise-grade verification powered by AI. Get results in seconds.
                            </p>

                            {/* CTA Buttons */}
                            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                                <Link
                                    href={route('register')}
                                    className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-lg font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition transform hover:scale-105 text-sm sm:text-base"
                                >
                                    Get Started
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                                <button
                                    onClick={() => scrollToSection('about')}
                                    className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-lg font-semibold text-primary bg-muted hover:bg-muted/80 transition text-sm sm:text-base"
                                >
                                    Learn More
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-4 sm:gap-6 max-w-md mx-auto pt-6 md:pt-8">
                                {stats.map((stat, idx) => (
                                    <div key={idx} className="p-4 sm:p-6 rounded-xl bg-card/50 backdrop-blur border border-border">
                                        <div className="text-xl sm:text-2xl font-bold text-primary">{stat.number}</div>
                                        <div className="text-xs sm:text-sm text-muted-foreground mt-1">{stat.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* About Section (snap-center) */}
                    <section id="about" className="h-screen w-screen snap-center flex items-center justify-center py-12 md:py-16 px-4 sm:px-6 md:px-8">
                        <div className="max-w-7xl mx-auto w-full">
                            <div className="text-center mb-12 md:mb-16 space-y-4">
                                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">Why Choose RECheck</h2>
                                <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                                    Built for modern teams that demand speed, accuracy, and security.
                                </p>
                            </div>

                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                                {features.map((feature, idx) => (
                                    <div
                                        key={idx}
                                        className="p-6 md:p-8 rounded-xl bg-card border border-border hover:border-primary transition group space-y-4"
                                    >
                                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition">
                                            {feature.icon}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg">{feature.title}</h3>
                                            <p className="text-muted-foreground text-sm mt-2">{feature.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Testimonials Section (snap-center) */}
                    <section id="testimonials" className="h-screen w-screen snap-center flex items-center justify-center py-12 md:py-16 px-4 sm:px-6 md:px-8 bg-muted">
                        <div className="max-w-7xl mx-auto w-full">
                            <div className="text-center mb-12 md:mb-16 space-y-4">
                                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">Trusted by Research Leaders</h2>
                                <p className="text-base sm:text-lg text-muted-foreground">Join hundreds of organizations using RECheck</p>
                            </div>

                            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                                {testimonials.map((testimonial, idx) => (
                                    <div
                                        key={idx}
                                        className="p-6 md:p-8 rounded-xl bg-card border border-border shadow-sm hover:shadow-lg transition space-y-4"
                                    >
                                        {/* Stars */}
                                        <div className="flex gap-1">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                                            ))}
                                        </div>

                                        {/* Quote */}
                                        <p className="text-foreground italic text-sm md:text-base">"{testimonial.quote}"</p>

                                        {/* Author */}
                                        <div className="flex items-center gap-3 pt-2">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-semibold text-xs flex-shrink-0">
                                                {testimonial.avatar}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-semibold text-foreground text-sm">{testimonial.name}</div>
                                                <div className="text-xs text-muted-foreground truncate">{testimonial.role}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Contact & Footer Section (snap-center) */}
                    <section id="contact" className="h-screen w-screen snap-center flex flex-col items-center justify-between py-12 md:py-16 px-4 sm:px-6 md:px-8">
                        {/* Contact Form */}
                        <div className="w-full flex-1 flex flex-col items-center justify-center">
                            <div className="w-full max-w-2xl">
                                <div className="text-center mb-8 md:mb-12 space-y-4">
                                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">Get in Touch</h2>
                                    <p className="text-base sm:text-lg text-muted-foreground">
                                        Have questions? We'd love to hear from you.
                                    </p>
                                </div>

                                <form className="space-y-6 md:space-y-8 bg-card p-6 sm:p-8 rounded-xl border border-border mx-auto w-full max-w-md sm:max-w-full">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Name</label>
                                        <input
                                            type="text"
                                            placeholder="Your name"
                                            className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Email</label>
                                        <input
                                            type="email"
                                            placeholder="you@example.com"
                                            className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Message</label>
                                        <textarea
                                            placeholder="Your message..."
                                            rows="5"
                                            className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-foreground resize-none text-sm"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full px-6 py-3 rounded-lg font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition flex items-center justify-center gap-2 text-sm sm:text-base"
                                    >
                                        <Mail className="w-4 h-4" />
                                        Send Message
                                    </button>
                                </form>

                                {/* Social Links */}
                                <div className="text-center space-y-4 mt-8">
                                    <p className="text-sm text-muted-foreground">Or connect with us on social media</p>
                                    <div className="flex justify-center gap-6">
                                        <a href="#" className="hover:text-primary transition p-2" aria-label="Twitter">
                                            <Twitter className="w-5 h-5" />
                                        </a>
                                        <a href="#" className="hover:text-primary transition p-2" aria-label="LinkedIn">
                                            <Linkedin className="w-5 h-5" />
                                        </a>
                                        <a href="#" className="hover:text-primary transition p-2" aria-label="Email">
                                            <Mail className="w-5 h-5" />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <footer className="w-full border-t text-muted-foreground py-8 md:py-12">
                            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 md:px-8">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mb-6 pb-6 border-b border-border">
                                    {/* Brand */}
                                    <div className="space-y-2 text-center sm:text-left">
                                        <div className="flex items-center gap-2 justify-center sm:justify-start">
                                            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                                                <CheckCircle className="w-5 h-5 text-primary-foreground" />
                                            </div>
                                            <h3 className="font-bold text-foreground text-sm">RECheck</h3>
                                        </div>
                                        <p className="text-xs">Verify everything instantly.</p>
                                    </div>

                                    {/* Product Links */}
                                    <div className="space-y-2 text-center sm:text-left">
                                        <h4 className="font-semibold text-foreground text-xs">Product</h4>
                                        <ul className="space-y-1 text-xs">
                                            <li><a href="#" className="hover:text-primary transition">Features</a></li>
                                            <li><a href="#" className="hover:text-primary transition">Pricing</a></li>
                                            <li><a href="#" className="hover:text-primary transition">Security</a></li>
                                        </ul>
                                    </div>

                                    {/* Company Links */}
                                    <div className="space-y-2 text-center sm:text-left">
                                        <h4 className="font-semibold text-foreground text-xs">Company</h4>
                                        <ul className="space-y-1 text-xs">
                                            <li><a href="#" className="hover:text-primary transition">About</a></li>
                                            <li><a href="#" className="hover:text-primary transition">Blog</a></li>
                                            <li><a href="#" className="hover:text-primary transition">Careers</a></li>
                                        </ul>
                                    </div>

                                    {/* Legal Links */}
                                    <div className="space-y-2 text-center sm:text-left">
                                        <h4 className="font-semibold text-foreground text-xs">Legal</h4>
                                        <ul className="space-y-1 text-xs">
                                            <li><a href="#" className="hover:text-primary transition">Privacy</a></li>
                                            <li><a href="#" className="hover:text-primary transition">Terms</a></li>
                                            <li><a href="#" className="hover:text-primary transition">Contact</a></li>
                                        </ul>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
                                    <p className="text-xs">© 2026 RECheck. All rights reserved.</p>
                                    <div className="flex gap-3">
                                        <a href="#" className="hover:text-primary transition" aria-label="Twitter"><Twitter className="w-4 h-4" /></a>
                                        <a href="#" className="hover:text-primary transition" aria-label="LinkedIn"><Linkedin className="w-4 h-4" /></a>
                                        <a href="#" className="hover:text-primary transition" aria-label="Email"><Mail className="w-4 h-4" /></a>
                                    </div>
                                </div>
                            </div>
                        </footer>
                    </section>
                </main>

                {/* Scroll-to-Top Button */}
                <button
                    onClick={scrollToTop}
                    className={`fixed bottom-8 right-8 p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 border border-border shadow-lg transition-all z-40 ${showScrollTop ? 'opacity-100 visible' : 'opacity-0 invisible'
                        }`}
                    aria-label="Scroll to top"
                >
                    <ArrowUp className="w-5 h-5" />
                </button>
            </div>
        </>
    );
}
