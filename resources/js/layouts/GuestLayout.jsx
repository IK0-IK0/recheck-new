export default function GuestLayout({ children }) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-muted p-6">
            <div className="w-full max-w-md rounded-3xl border border-border bg-background p-8 shadow-lg">
                {children}
            </div>
        </div>
    );
}
