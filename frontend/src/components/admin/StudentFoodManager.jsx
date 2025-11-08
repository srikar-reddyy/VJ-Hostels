import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAdmin } from '../../context/AdminContext';
import FoodAnalytics from './FoodAnalyticsFixed';

const StudentFoodManager = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [dateView, setDateView] = useState('today'); // 'today' or 'tomorrow'
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [todayStats, setTodayStats] = useState(null);
    const [tomorrowStats, setTomorrowStats] = useState(null);
    const { token } = useAdmin();

    const getDefaultStats = () => ({
        date: '',
        summary: {
            totalStudents: 0,
            availableStudents: 0,
            totalStudentsWithPause: 0,
            studentsTakingMeals: 0,
            totalMealsAvailable: 0,
            totalMealsPaused: 0,
            totalMealsServed: 0,
            pausePercentage: 0
        },
        mealWiseStats: {
            breakfast: { paused: 0, available: 0, served: 0, students: [] },
            lunch: { paused: 0, available: 0, served: 0, students: [] },
            snacks: { paused: 0, available: 0, served: 0, students: [] },
            dinner: { paused: 0, available: 0, served: 0, students: [] }
        },
        statusDistribution: {},
        allPauses: []
    });

    useEffect(() => {
        fetchAllStats();
    }, []);

    const getTodayDate = () => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    };

    const getTomorrowDate = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    };

    const fetchAllStats = async () => {
        setLoading(true);
        await Promise.all([
            fetchStatsForDate(getTodayDate(), 'today'),
            fetchStatsForDate(getTomorrowDate(), 'tomorrow')
        ]);
        setLoading(false);
    };
    
    const fetchStatsForDate = async (date, type) => {
        try {
            const response = await axios.get(
                `${import.meta.env.VITE_SERVER_URL}/food-api/admin/food/stats/date?date=${date}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            
            if (type === 'today') {
                setTodayStats(response.data);
            } else {
                setTomorrowStats(response.data);
            }
            setError('');
        } catch (err) {
            console.error(`Error fetching ${type} stats:`, err);
            setError(`Failed to fetch ${type} stats: ${err.response?.data?.error || err.message}`);
            
            // Set default stats on error
            if (type === 'today') {
                setTodayStats(getDefaultStats());
            } else {
                setTomorrowStats(getDefaultStats());
            }
        }
    };

    // Get current stats based on selected date view
    const currentStats = dateView === 'today' ? todayStats : tomorrowStats;

    if (loading) {
        return (
            <div className="text-center my-4">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2">Loading food management data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="alert alert-danger" role="alert">
                {error}
                <button 
                    className="btn btn-sm btn-outline-danger ms-3"
                    onClick={fetchAllStats}
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!currentStats) {
        return (
            <div className="alert alert-warning" role="alert">
                No data available
            </div>
        );
    }

    return (
        <div className="student-food-manager">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h4>👥 Student Food Management</h4>
                    <small className="text-muted">
                        {dateView === 'today' ? 'Today' : 'Tomorrow'}: {currentStats.date}
                    </small>
                </div>
                
                {activeTab === 'overview' && (
                    <div className="d-flex gap-2">
                        <button 
                            className="btn btn-primary"
                            onClick={fetchAllStats}
                        >
                            <i className="bi bi-arrow-clockwise me-2"></i>
                            Refresh Data
                        </button>
                    </div>
                )}
            </div>

            {/* Navigation Tabs */}
            <div className="card mb-4">
                <div className="card-header">
                    <ul className="nav nav-tabs card-header-tabs">
                        <li className="nav-item">
                            <button
                                className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
                                onClick={() => setActiveTab('overview')}
                                style={{ color: activeTab === 'overview' ? '#0c63e4' : '#333' }}
                            >
                                <i className="bi bi-speedometer2 me-2"></i>
                                Overview
                            </button>
                        </li>
                    </ul>
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <div>
                    {/* Date Toggle Buttons */}
                    <div className="btn-group mb-4 w-100" role="group">
                        <button
                            type="button"
                            className={`btn ${dateView === 'today' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setDateView('today')}
                        >
                            <i className="bi bi-calendar-day me-2"></i>
                            Today ({getTodayDate()})
                        </button>
                        <button
                            type="button"
                            className={`btn ${dateView === 'tomorrow' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setDateView('tomorrow')}
                        >
                            <i className="bi bi-calendar-plus me-2"></i>
                            Tomorrow ({getTomorrowDate()})
                        </button>
                    </div>

                    {/* Summary Statistics Cards */}
                    <div className="row g-3 mb-4">
                        <div className="col-md-3">
                            <div className="card bg-primary text-white h-100">
                                <div className="card-body">
                                    <h6 className="card-title">Total Students</h6>
                                    <h3 className="mb-0">{currentStats.summary.totalStudents}</h3>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card bg-success text-white h-100">
                                <div className="card-body">
                                    <h6 className="card-title">Taking Meals</h6>
                                    <h3 className="mb-0">{currentStats.summary.studentsTakingMeals}</h3>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card bg-warning text-dark h-100">
                                <div className="card-body">
                                    <h6 className="card-title">With Pauses</h6>
                                    <h3 className="mb-0">{currentStats.summary.totalStudentsWithPause}</h3>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card bg-info text-white h-100">
                                <div className="card-body">
                                    <h6 className="card-title">Total Meals Paused</h6>
                                    <h3 className="mb-0">{currentStats.summary.totalMealsPaused}</h3>
                                    <small>({currentStats.summary.pausePercentage}%)</small>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Meal-Wise Pause Statistics */}
                    <div className="row g-3">
                        <div className="col-md-6 col-lg-3">
                            <div className="card border-warning h-100">
                                <div className="card-body">
                                    <h6 className="card-title text-warning">🌅 Breakfast</h6>
                                    <h3 className="mb-1 text-warning">{currentStats.mealWiseStats.breakfast.paused}</h3>
                                    <small className="text-muted">
                                        Available: {currentStats.mealWiseStats.breakfast.available} | 
                                        Served: {currentStats.mealWiseStats.breakfast.served}
                                    </small>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6 col-lg-3">
                            <div className="card border-info h-100">
                                <div className="card-body">
                                    <h6 className="card-title text-info">🍛 Lunch</h6>
                                    <h3 className="mb-1 text-info">{currentStats.mealWiseStats.lunch.paused}</h3>
                                    <small className="text-muted">
                                        Available: {currentStats.mealWiseStats.lunch.available} | 
                                        Served: {currentStats.mealWiseStats.lunch.served}
                                    </small>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6 col-lg-3">
                            <div className="card border-success h-100">
                                <div className="card-body">
                                    <h6 className="card-title text-success">☕ Snacks</h6>
                                    <h3 className="mb-1 text-success">{currentStats.mealWiseStats.snacks.paused}</h3>
                                    <small className="text-muted">
                                        Available: {currentStats.mealWiseStats.snacks.available} | 
                                        Served: {currentStats.mealWiseStats.snacks.served}
                                    </small>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6 col-lg-3">
                            <div className="card border-danger h-100">
                                <div className="card-body">
                                    <h6 className="card-title text-danger">🌙 Dinner</h6>
                                    <h3 className="mb-1 text-danger">{currentStats.mealWiseStats.dinner.paused}</h3>
                                    <small className="text-muted">
                                        Available: {currentStats.mealWiseStats.dinner.available} | 
                                        Served: {currentStats.mealWiseStats.dinner.served}
                                    </small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'analytics' && (
                <FoodAnalytics />
            )}
        </div>
    );
};

export default StudentFoodManager;
