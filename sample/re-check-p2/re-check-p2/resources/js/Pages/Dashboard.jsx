import { Head, Link, usePage } from '@inertiajs/react';
import { CheckCircle, LogOut, User, MoreHorizontal, TrendingUp, CheckCheck, Clock, Users, Plus, Download, Settings } from 'lucide-react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function Dashboard() {
    const { auth } = usePage().props;
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [dateRange, setDateRange] = useState('7days');

    // Mock stats data
    const stats = [
        {
            title: 'Total Checks',
            value: '1,234',
            trend: '+12.5%',
            icon: CheckCheck,
        },
        {
            title: 'Success Rate',
            value: '98.7%',
            trend: '+2.3%',
            icon: CheckCircle,
        },
        {
            title: 'Avg Response',
            value: '2.1s',
            trend: '-0.3s',
            icon: Clock,
        },
        {
            title: 'Active Users',
            value: '47',
            trend: '+5 today',
            icon: Users,
        },
    ];

    // Mock recent activity data
    const recentActivity = [
        { id: 1, checkId: 'CHK-001', status: 'Success', created: '2 minutes ago', duration: '1.8s', user: 'John Doe' },
        { id: 2, checkId: 'CHK-002', status: 'Pending', created: '15 minutes ago', duration: '—', user: 'Jane Smith' },
        { id: 3, checkId: 'CHK-003', status: 'Error', created: '1 hour ago', duration: '2.1s', user: 'Mike Johnson' },
        { id: 4, checkId: 'CHK-004', status: 'Success', created: '2 hours ago', duration: '2.0s', user: 'Sarah Wilson' },
        { id: 5, checkId: 'CHK-005', status: 'Success', created: '3 hours ago', duration: '1.9s', user: 'Tom Brown' },
    ];

    // Get status badge color
    const getStatusColor = (status) => {
        switch (status) {
            case 'Success':
                return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'Error':
                return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            case 'Pending':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
        }
    };

    return (
        <>
            <Head title="Dashboard" />
            <AuthenticatedLayout>
                <main className="space-y-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
                            <p className="text-muted-foreground mt-1">Welcome back, {auth.user?.name}!</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <select
                                value={dateRange}
                                onChange={(e) => setDateRange(e.target.value)}
                                className="px-3 py-2 rounded-lg bg-card border border-border text-foreground text-sm"
                            >
                                <option value="7days">Last 7 days</option>
                                <option value="30days">Last 30 days</option>
                                <option value="90days">Last 90 days</option>
                            </select>
                            <button className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition text-sm font-medium">
                                Refresh
                            </button>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {stats.map((stat, index) => {
                            const Icon = stat.icon;
                            return (
                                <div
                                    key={index}
                                    className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center">
                                            <Icon className="w-6 h-6 text-primary-foreground" />
                                        </div>
                                        <span className="text-sm font-semibold text-primary flex items-center gap-1">
                                            <TrendingUp className="w-4 h-4" />
                                            {stat.trend}
                                        </span>
                                    </div>
                                    <p className="text-muted-foreground text-sm mb-1">{stat.title}</p>
                                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Recent Activity Table */}
                    <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-border">
                            <h2 className="text-lg font-bold text-foreground">Recent Activity</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border bg-muted/50">
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Check ID</th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Created</th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Duration</th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">User</th>
                                        <th className="px-6 py-3 text-center text-sm font-semibold text-foreground">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentActivity.map((activity) => (
                                        <tr key={activity.id} className="border-b border-border hover:bg-muted/30 transition">
                                            <td className="px-6 py-4 text-sm font-medium text-foreground">{activity.checkId}</td>
                                            <td className="px-6 py-4 text-sm">
                                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(activity.status)}`}>
                                                    {activity.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-muted-foreground">{activity.created}</td>
                                            <td className="px-6 py-4 text-sm text-muted-foreground">{activity.duration}</td>
                                            <td className="px-6 py-4 text-sm text-muted-foreground">{activity.user}</td>
                                            <td className="px-6 py-4 text-center">
                                                <button className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-muted transition">
                                                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <button className="bg-primary hover:bg-primary/90 text-primary-foreground py-3 px-6 rounded-lg font-semibold transition flex items-center justify-center gap-2">
                            <Plus className="w-5 h-5" />
                            New Check
                        </button>
                        <button className="bg-card border border-border hover:bg-muted text-foreground py-3 px-6 rounded-lg font-semibold transition flex items-center justify-center gap-2">
                            <Download className="w-5 h-5" />
                            Export Data
                        </button>
                        <button className="bg-card border border-border hover:bg-muted text-foreground py-3 px-6 rounded-lg font-semibold transition flex items-center justify-center gap-2">
                            <Settings className="w-5 h-5" />
                            Settings
                        </button>
                    </div>
                </main>
            </AuthenticatedLayout>
        </>
    );
}
