import { Link } from '@inertiajs/react';
import { CheckCircle, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function GuestNavbar({ auth }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeSection, setActiveSection] = useState('home');

    // Track active section/page based on scroll position
    useEffect(() => {
        const handleScroll = () => {
            const currentPath = window.location.pathname;
            
            // Get the main scrollable container
            const scrollContainer = document.querySelector('main[style*="scroll"]') || window;
            const scrollY = scrollContainer === window ? window.scrollY : scrollContainer.scrollTop;
            
            console.log('Scrolling... Y position:', scrollY, 'Path:', currentPath);

            // Only track scroll position on the welcome/home page
            if (currentPath === '/') {
                const sections = ['home', 'about', 'testimonials', 'contact'];
                let currentSection = 'home';

                // Check which section is closest to the top of the viewport
                for (const section of sections) {
                    const element = document.getElementById(section);
                    if (element) {
                        const rect = element.getBoundingClientRect();
                        console.log(`${section}: top=${rect.top}, viewport center=${window.innerHeight / 2}`);
                        // If section top is within viewport, it's the active section
                        if (rect.top <= window.innerHeight / 2) {
                            currentSection = section;
                        }
                    }
                }

                console.log('Active section:', currentSection);
                setActiveSection(currentSection);
            } else {
                console.log('Not on home page, current path:', currentPath);
            }
        };

        // Listen to scroll on the main container
        const scrollContainer = document.querySelector('main[style*="scroll"]');
        
        const handleHashChange = () => {
            const currentPath = window.location.pathname;
            // If on login page, set active to 'login'
            if (currentPath.includes('/login')) {
                setActiveSection('login');
            }
            // If on register page, set active to 'register'
            else if (currentPath.includes('/register')) {
                setActiveSection('register');
            }
            // Otherwise use hash-based section
            else {
                const hash = window.location.hash.replace('#', '') || 'home';
                setActiveSection(hash);
            }
        };

        if (scrollContainer) {
            console.log('Found custom scroll container');
            scrollContainer.addEventListener('scroll', handleScroll);
        } else {
            console.log('Using window scroll');
            window.addEventListener('scroll', handleScroll);
        }

        window.addEventListener('hashchange', handleHashChange);
        handleHashChange(); // Set initial active section

        return () => {
            if (scrollContainer) {
                scrollContainer.removeEventListener('scroll', handleScroll);
            } else {
                window.removeEventListener('scroll', handleScroll);
            }
            window.removeEventListener('hashchange', handleHashChange);
        };
    }, []);

    // Navigate to external pages (from landing)
    const navigateTo = (path) => {
        window.location.href = path === 'home' ? '/' : `/#${path}`;
        setMobileMenuOpen(false);
    };

    // Check if a nav item is active
    const isActive = (section) => activeSection === section;

    return (
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
                            onClick={() => navigateTo('home')}
                            className={`text-sm font-medium text-muted-foreground hover:text-primary transition ${isActive('home') ? 'border-b-2 border-primary text-primary' : ''}`}
                        >
                            Home
                        </button>
                        <button
                            onClick={() => navigateTo('about')}
                            className={`text-sm font-medium text-muted-foreground hover:text-primary transition ${isActive('about') ? 'border-b-2 border-primary text-primary' : ''}`}
                        >
                            About
                        </button>
                        <button
                            onClick={() => navigateTo('testimonials')}
                            className={`text-sm font-medium text-muted-foreground hover:text-primary transition ${isActive('testimonials') ? 'border-b-2 border-primary text-primary' : ''}`}
                        >
                            Testimonials
                        </button>
                        <button
                            onClick={() => navigateTo('contact')}
                            className={`text-sm font-medium text-muted-foreground hover:text-primary transition ${isActive('contact') ? 'border-b-2 border-primary text-primary' : ''}`}
                        >
                            Contact
                        </button>
                    </div>

                    {/* Auth Buttons Desktop */}
                    <div className="hidden md:flex items-center gap-3">
                        {auth.user ? (
                            <>
                                <Link
                                    href={route('dashboard')}
                                    className="px-4 py-2 rounded-lg font-medium text-primary-foreground bg-primary hover:bg-primary/90 transition text-sm"
                                >
                                    Dashboard
                                </Link>
                                <Link
                                    href={route('logout')}
                                    method="post"
                                    as="button"
                                    className="px-4 py-2 rounded-lg font-medium text-foreground hover:text-primary transition text-sm"
                                >
                                    Logout
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link
                                    href={route('login')}
                                    className={`px-4 py-2 rounded-lg font-medium transition text-sm ${isActive('login') ? 'text-primary underline' : 'text-foreground hover:text-primary'}`}
                                >
                                    Log in
                                </Link>
                                <Link
                                    href={route('register')}
                                    className={`px-4 py-2 rounded-lg font-medium text-primary-foreground transition text-sm ${isActive('register') ? 'bg-primary underline' : 'bg-primary hover:bg-primary/90'}`}
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
                    <div className="mt-4 pt-4 border-t border-border flex flex-col gap-3 pb-4 max-h-[60vh] overflow-y-auto">
                        <button
                            onClick={() => navigateTo('home')}
                            className={isActive('home') ? 'text-sm font-medium text-primary text-left py-2 border-l-2 border-primary pl-2' : 'text-sm font-medium text-muted-foreground hover:text-primary transition text-left py-2'}
                        >
                            Home
                        </button>
                        <button
                            onClick={() => navigateTo('about')}
                            className={isActive('about') ? 'text-sm font-medium text-primary text-left py-2 border-l-2 border-primary pl-2' : 'text-sm font-medium text-muted-foreground hover:text-primary transition text-left py-2'}
                        >
                            About
                        </button>
                        <button
                            onClick={() => navigateTo('testimonials')}
                            className={isActive('testimonials') ? 'text-sm font-medium text-primary text-left py-2 border-l-2 border-primary pl-2' : 'text-sm font-medium text-muted-foreground hover:text-primary transition text-left py-2'}
                        >
                            Testimonials
                        </button>
                        <button
                            onClick={() => navigateTo('contact')}
                            className={isActive('contact') ? 'text-sm font-medium text-primary text-left py-2 border-l-2 border-primary pl-2' : 'text-sm font-medium text-muted-foreground hover:text-primary transition text-left py-2'}
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
    );
}
