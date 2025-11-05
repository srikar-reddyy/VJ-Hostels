import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAdmin } from '../../context/AdminContext';
import FoodCountManager from './FoodCountManager';
import StudentFoodManager from './StudentFoodManager';

const Food = () => {
    const [activeTab, setActiveTab] = useState('menu');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [feedbacks, setFeedbacks] = useState([]);
    const [feedbackLoading, setFeedbackLoading] = useState(false);
    const { token } = useAdmin();

    // Monthly menu data from backend
    const [monthlyMenuData, setMonthlyMenuData] = useState({});

    // Selected cell state for editing
    const [selectedCell, setSelectedCell] = useState(null);
    const [editFormData, setEditFormData] = useState({
        week: '',
        day: '',
        breakfast: '',
        lunch: '',
        snacks: '',
        dinner: ''
    });

    const getRotationWeek = (date = new Date()) => {
        const ROTATION_EPOCH_UTC = new Date(Date.UTC(2025, 0, 6));
        const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const weeksSinceEpoch = Math.floor((d - ROTATION_EPOCH_UTC) / MS_PER_WEEK);
        const idx = ((weeksSinceEpoch % 4) + 4) % 4;
        return idx + 1;
    };

    const [currentWeek] = useState(() => getRotationWeek());
    const [selectedWeek, setSelectedWeek] = useState(() => `week${getRotationWeek()}`);

    useEffect(() => {
        if (activeTab === 'menu') {
            fetchMonthlyMenu();
        } else if (activeTab === 'feedback') {
            fetchFeedbacks();
        }
    }, [activeTab, token]);

    const fetchMonthlyMenu = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${import.meta.env.VITE_SERVER_URL}/food-api/menu/templates`);

            if (response.data && response.data.success && Array.isArray(response.data.data)) {
                const map = {};
                response.data.data.forEach(t => {
                    if (t.weekName && t.days) map[t.weekName] = t.days;
                });
                for (let i = 1; i <= 4; i++) {
                    const key = `week${i}`;
                    if (!map[key]) {
                        map[key] = {
                            monday: { breakfast: '', lunch: '', snacks: '', dinner: '' },
                            tuesday: { breakfast: '', lunch: '', snacks: '', dinner: '' },
                            wednesday: { breakfast: '', lunch: '', snacks: '', dinner: '' },
                            thursday: { breakfast: '', lunch: '', snacks: '', dinner: '' },
                            friday: { breakfast: '', lunch: '', snacks: '', dinner: '' },
                            saturday: { breakfast: '', lunch: '', snacks: '', dinner: '' },
                            sunday: { breakfast: '', lunch: '', snacks: '', dinner: '' }
                        };
                    }
                }
                setMonthlyMenuData(map);
            }
            setError('');
        } catch (err) {
            setError('Failed to load weekly templates');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCellClick = (week, day, mealType) => {
        const dayData = monthlyMenuData[week][day];
        setSelectedCell({ week, day, mealType });
        setEditFormData({
            week: week,
            day: day,
            breakfast: dayData.breakfast,
            lunch: dayData.lunch,
            snacks: dayData.snacks,
            dinner: dayData.dinner
        });
    };

    const handleEditFormChange = (e) => {
        const { name, value } = e.target;
        setEditFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleEditFormSubmit = async (e) => {
        e.preventDefault();
        if (!editFormData.week || !editFormData.day) return;

        try {
            const response = await axios.put(`${import.meta.env.VITE_SERVER_URL}/food-api/menu/day`, {
                week: editFormData.week,
                day: editFormData.day,
                breakfast: editFormData.breakfast,
                lunch: editFormData.lunch,
                snacks: editFormData.snacks,
                dinner: editFormData.dinner
            });

            if (response.data.success) {
                setMonthlyMenuData(prev => ({
                    ...prev,
                    [editFormData.week]: {
                        ...prev[editFormData.week],
                        [editFormData.day]: {
                            breakfast: editFormData.breakfast,
                            lunch: editFormData.lunch,
                            snacks: editFormData.snacks,
                            dinner: editFormData.dinner
                        }
                    }
                }));

                setSelectedCell(null);
                setEditFormData({
                    week: '',
                    day: '',
                    breakfast: '',
                    lunch: '',
                    snacks: '',
                    dinner: ''
                });
            }
        } catch (error) {
            console.error('Error updating menu:', error);
        }
    };

    const fetchFeedbacks = async () => {
        try {
            setFeedbackLoading(true);
            const response = await axios.get(`${import.meta.env.VITE_SERVER_URL}/food-api/feedback`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data && response.data.success) {
                setFeedbacks(response.data.data || []);
            }
        } catch (err) {
            console.error('Failed to fetch feedbacks:', err);
        } finally {
            setFeedbackLoading(false);
        }
    };

    return (
        <div style={{ padding: '0' }}>
            <style>
                {`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    @keyframes fadeIn {
                        0% { opacity: 0; }
                        100% { opacity: 1; }
                    }
                    @keyframes slideIn {
                        0% { transform: scale(0.9) translateY(-20px); opacity: 0; }
                        100% { transform: scale(1) translateY(0); opacity: 1; }
                    }
                `}
            </style>
            
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ 
                    fontSize: '1.875rem', 
                    fontWeight: '700', 
                    color: '#1E293B',
                    margin: '0 0 1rem 0'
                }}>Food Management</h2>
                <div style={{ 
                    display: 'flex', 
                    gap: '0.5rem',
                    flexWrap: 'wrap'
                }}>
                    <button
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            border: 'none',
                            fontSize: '0.8rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            backgroundColor: activeTab === 'menu' ? '#4F46E5' : 'white',
                            color: activeTab === 'menu' ? 'white' : '#64748B',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            border: activeTab === 'menu' ? 'none' : '1px solid #E5E7EB',
                            minWidth: 'fit-content',
                            whiteSpace: 'nowrap'
                        }}
                        onClick={() => setActiveTab('menu')}
                    >
                        📅 Menu
                    </button>
                    <button
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            border: 'none',
                            fontSize: '0.8rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            backgroundColor: activeTab === 'students' ? '#4F46E5' : 'white',
                            color: activeTab === 'students' ? 'white' : '#64748B',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            border: activeTab === 'students' ? 'none' : '1px solid #E5E7EB',
                            minWidth: 'fit-content',
                            whiteSpace: 'nowrap'
                        }}
                        onClick={() => setActiveTab('students')}
                    >
                        👥 Students
                    </button>
                    <button
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            border: 'none',
                            fontSize: '0.8rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            backgroundColor: activeTab === 'feedback' ? '#4F46E5' : 'white',
                            color: activeTab === 'feedback' ? 'white' : '#64748B',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            border: activeTab === 'feedback' ? 'none' : '1px solid #E5E7EB',
                            minWidth: 'fit-content',
                            whiteSpace: 'nowrap'
                        }}
                        onClick={() => setActiveTab('feedback')}
                    >
                        💬 Reviews
                    </button>
                </div>
            </div>

            {activeTab === 'menu' && (
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    border: '1px solid #E5E7EB',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        backgroundColor: '#4F46E5',
                        color: 'white',
                        padding: '1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <h5 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600' }}>
                            📋 Weekly Menu - Click to Edit
                        </h5>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <label style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255,255,255,0.9)' }}>
                                Select Week:
                            </label>
                            <select
                                style={{
                                    padding: '0.5rem',
                                    borderRadius: '6px',
                                    border: 'none',
                                    fontSize: '0.875rem',
                                    minWidth: '150px'
                                }}
                                value={selectedWeek}
                                onChange={(e) => setSelectedWeek(e.target.value)}
                            >
                                <option value="">Select Week...</option>
                                {Object.keys(monthlyMenuData).map((weekKey) => {
                                    const weekNumber = parseInt(weekKey.replace('week', ''));
                                    const isCurrentWeek = weekNumber === currentWeek;
                                    return (
                                        <option key={weekKey} value={weekKey}>
                                            Week {weekNumber} {isCurrentWeek ? '(Current)' : ''}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    </div>
                    <div style={{ padding: '1.5rem' }}>
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '2rem' }}>
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    border: '4px solid #E0E7FF',
                                    borderTop: '4px solid #4F46E5',
                                    borderRadius: '50%',
                                    animation: 'spin 1s linear infinite',
                                    margin: '0 auto 1rem'
                                }} />
                                <p style={{ color: '#64748B' }}>Loading menu...</p>
                            </div>
                        ) : error ? (
                            <div style={{
                                backgroundColor: '#FEE2E2',
                                border: '1px solid #FCA5A5',
                                borderRadius: '8px',
                                padding: '1rem',
                                color: '#991B1B'
                            }}>
                                {error}
                            </div>
                        ) : (
                            <div>
                                {Object.entries(monthlyMenuData)
                                    .filter(([weekKey]) => {
                                        if (selectedWeek === 'all') return true;
                                        return weekKey === selectedWeek;
                                    })
                                    .map(([weekKey, weekData]) => (
                                    <div key={weekKey} style={{ marginBottom: '2rem' }}>
                                        <h6 style={{
                                            marginBottom: '1rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            color: parseInt(weekKey.replace('week', '')) === currentWeek ? '#10B981' : '#4F46E5',
                                            fontSize: '1.125rem',
                                            fontWeight: '600'
                                        }}>
                                            📅 {weekKey.charAt(0).toUpperCase() + weekKey.slice(1)}
                                            {parseInt(weekKey.replace('week', '')) === currentWeek && (
                                                <span style={{
                                                    backgroundColor: '#10B981',
                                                    color: 'white',
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '12px',
                                                    fontSize: '0.75rem',
                                                    marginLeft: '1rem'
                                                }}>
                                                    Current Week
                                                </span>
                                            )}
                                        </h6>
                                        <div style={{
                                            borderRadius: '8px',
                                            overflow: 'hidden',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                            border: '1px solid #E5E7EB'
                                        }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                                <thead style={{ backgroundColor: '#F8FAFC' }}>
                                                    <tr>
                                                        <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', width: '12%' }}>Day</th>
                                                        <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', width: '22%' }}>
                                                            🌅 Breakfast
                                                        </th>
                                                        <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', width: '22%' }}>
                                                            ☀️ Lunch
                                                        </th>
                                                        <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', width: '22%' }}>
                                                            ☕ Snacks
                                                        </th>
                                                        <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', width: '22%' }}>
                                                            🌙 Dinner
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {Object.entries(weekData).map(([dayKey, dayData]) => (
                                                        <tr key={dayKey} style={{ borderTop: '1px solid #E5E7EB' }}>
                                                            <td style={{
                                                                padding: '1rem',
                                                                textAlign: 'center',
                                                                fontWeight: '600',
                                                                textTransform: 'capitalize',
                                                                backgroundColor: '#F8FAFC'
                                                            }}>
                                                                {dayKey}
                                                            </td>
                                                            {['breakfast', 'lunch', 'snacks', 'dinner'].map(mealType => (
                                                                <td
                                                                    key={mealType}
                                                                    style={{
                                                                        padding: '0.75rem',
                                                                        cursor: 'pointer',
                                                                        backgroundColor: selectedCell?.week === weekKey && selectedCell?.day === dayKey && selectedCell?.mealType === mealType ? '#E0E7FF' : 'white',
                                                                        transition: 'all 0.2s ease',
                                                                        borderLeft: selectedCell?.week === weekKey && selectedCell?.day === dayKey && selectedCell?.mealType === mealType ? '3px solid #4F46E5' : '3px solid transparent'
                                                                    }}
                                                                    onClick={() => handleCellClick(weekKey, dayKey, mealType)}
                                                                    onMouseEnter={(e) => {
                                                                        if (!(selectedCell?.week === weekKey && selectedCell?.day === dayKey && selectedCell?.mealType === mealType)) {
                                                                            e.currentTarget.style.backgroundColor = '#F1F5F9';
                                                                        }
                                                                    }}
                                                                    onMouseLeave={(e) => {
                                                                        if (!(selectedCell?.week === weekKey && selectedCell?.day === dayKey && selectedCell?.mealType === mealType)) {
                                                                            e.currentTarget.style.backgroundColor = 'white';
                                                                        }
                                                                    }}
                                                                >
                                                                    <div style={{
                                                                        fontSize: '0.8rem',
                                                                        lineHeight: '1.4',
                                                                        color: '#374151',
                                                                        minHeight: '2.5rem',
                                                                        display: 'flex',
                                                                        alignItems: 'center'
                                                                    }}>
                                                                        {dayData[mealType] || <em style={{ color: '#9CA3AF' }}>Click to add</em>}
                                                                    </div>
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {selectedCell && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem',
                    animation: 'fadeIn 0.3s ease-out'
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                        width: '100%',
                        maxWidth: '500px',
                        maxHeight: '90vh',
                        overflow: 'hidden',
                        animation: 'slideIn 0.3s ease-out'
                    }}>
                        <div style={{
                            backgroundColor: '#4F46E5',
                            color: 'white',
                            padding: '1.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <h5 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600' }}>
                                ✏️ Edit Menu Item
                            </h5>
                            <button
                                onClick={() => setSelectedCell(null)}
                                style={{
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    color: 'white',
                                    cursor: 'pointer',
                                    padding: '0.5rem',
                                    fontSize: '1.5rem',
                                    borderRadius: '50%',
                                    width: '40px',
                                    height: '40px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                            >
                                ×
                            </button>
                        </div>
                        <div style={{ 
                            padding: '1.5rem',
                            maxHeight: 'calc(90vh - 80px)',
                            overflowY: 'auto'
                        }}>
                            <div style={{
                                backgroundColor: '#E0E7FF',
                                border: '1px solid #C7D2FE',
                                borderRadius: '8px',
                                padding: '1rem',
                                marginBottom: '1.5rem'
                            }}>
                                <div style={{ fontSize: '0.875rem', color: '#4F46E5', marginBottom: '0.25rem' }}>Editing</div>
                                <div style={{ fontWeight: '600', color: '#1E293B' }}>
                                    {selectedCell.week.charAt(0).toUpperCase() + selectedCell.week.slice(1)} - {selectedCell.day.charAt(0).toUpperCase() + selectedCell.day.slice(1)}
                                </div>
                            </div>
                            
                            <form onSubmit={handleEditFormSubmit}>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>🌅 Breakfast</label>
                                    <textarea
                                        name="breakfast"
                                        value={editFormData.breakfast}
                                        onChange={handleEditFormChange}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            border: '1px solid #E5E7EB',
                                            borderRadius: '6px',
                                            resize: 'vertical',
                                            minHeight: '60px',
                                            fontSize: '0.875rem'
                                        }}
                                        placeholder="Enter breakfast items..."
                                    />
                                </div>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>☀️ Lunch</label>
                                    <textarea
                                        name="lunch"
                                        value={editFormData.lunch}
                                        onChange={handleEditFormChange}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            border: '1px solid #E5E7EB',
                                            borderRadius: '6px',
                                            resize: 'vertical',
                                            minHeight: '60px',
                                            fontSize: '0.875rem'
                                        }}
                                        placeholder="Enter lunch items..."
                                    />
                                </div>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>☕ Snacks</label>
                                    <textarea
                                        name="snacks"
                                        value={editFormData.snacks}
                                        onChange={handleEditFormChange}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            border: '1px solid #E5E7EB',
                                            borderRadius: '6px',
                                            resize: 'vertical',
                                            minHeight: '60px',
                                            fontSize: '0.875rem'
                                        }}
                                        placeholder="Enter snack items..."
                                    />
                                </div>
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>🌙 Dinner</label>
                                    <textarea
                                        name="dinner"
                                        value={editFormData.dinner}
                                        onChange={handleEditFormChange}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            border: '1px solid #E5E7EB',
                                            borderRadius: '6px',
                                            resize: 'vertical',
                                            minHeight: '60px',
                                            fontSize: '0.875rem'
                                        }}
                                        placeholder="Enter dinner items..."
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <button
                                        type="submit"
                                        style={{
                                            flex: 1,
                                            padding: '0.75rem',
                                            backgroundColor: '#10B981',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            transition: 'background-color 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = '#10B981'}
                                    >
                                        Update Menu
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedCell(null)}
                                        style={{
                                            flex: 1,
                                            padding: '0.75rem',
                                            backgroundColor: '#6B7280',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            transition: 'background-color 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#4B5563'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = '#6B7280'}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'students' && (
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    border: '1px solid #E5E7EB',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        backgroundColor: '#4F46E5',
                        color: 'white',
                        padding: '1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        <span>👥</span>
                        <h5 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600' }}>Student Food Management</h5>
                    </div>
                    <div style={{ padding: '1.5rem' }}>
                        <StudentFoodManager />
                    </div>
                </div>
            )}

            {activeTab === 'feedback' && (
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    border: '1px solid #E5E7EB',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        backgroundColor: '#4F46E5',
                        color: 'white',
                        padding: '1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        <span>💬</span>
                        <h5 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600' }}>Food Reviews & Feedback</h5>
                    </div>
                    <div style={{ padding: '1.5rem' }}>
                        {feedbackLoading ? (
                            <div style={{ textAlign: 'center', padding: '2rem' }}>
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    border: '4px solid #E0E7FF',
                                    borderTop: '4px solid #4F46E5',
                                    borderRadius: '50%',
                                    animation: 'spin 1s linear infinite',
                                    margin: '0 auto 1rem'
                                }} />
                                <p style={{ color: '#64748B' }}>Loading feedback...</p>
                            </div>
                        ) : feedbacks.length === 0 ? (
                            <div style={{
                                textAlign: 'center',
                                padding: '3rem',
                                color: '#64748B'
                            }}>
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
                                <h6 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem' }}>No Reviews Yet</h6>
                                <p style={{ margin: 0 }}>Student food reviews will appear here once submitted.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {feedbacks.map((feedback, index) => (
                                    <div key={index} style={{
                                        border: '1px solid #E5E7EB',
                                        borderRadius: '8px',
                                        padding: '1.25rem',
                                        backgroundColor: '#FAFAFA'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'flex-start',
                                            marginBottom: '1rem'
                                        }}>
                                            <div>
                                                <h6 style={{
                                                    margin: '0 0 0.25rem 0',
                                                    fontSize: '1rem',
                                                    fontWeight: '600',
                                                    color: '#1E293B'
                                                }}>
                                                    {feedback.studentName || 'Anonymous Student'}
                                                </h6>
                                                <div style={{
                                                    fontSize: '0.875rem',
                                                    color: '#64748B',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '1rem'
                                                }}>
                                                    <span>📧 {feedback.studentEmail || 'N/A'}</span>
                                                    <span>📅 {new Date(feedback.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.25rem'
                                            }}>
                                                {[...Array(5)].map((_, i) => (
                                                    <span key={i} style={{
                                                        color: i < (feedback.rating || 0) ? '#F59E0B' : '#E5E7EB',
                                                        fontSize: '1.25rem'
                                                    }}>★</span>
                                                ))}
                                                <span style={{
                                                    marginLeft: '0.5rem',
                                                    fontSize: '0.875rem',
                                                    color: '#64748B'
                                                }}>({feedback.rating || 0}/5)</span>
                                            </div>
                                        </div>
                                        
                                        {feedback.mealType && (
                                            <div style={{
                                                display: 'inline-block',
                                                backgroundColor: '#E0E7FF',
                                                color: '#4F46E5',
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '12px',
                                                fontSize: '0.75rem',
                                                fontWeight: '500',
                                                marginBottom: '1rem'
                                            }}>
                                                {feedback.mealType.charAt(0).toUpperCase() + feedback.mealType.slice(1)}
                                            </div>
                                        )}
                                        
                                        <div style={{
                                            backgroundColor: 'white',
                                            padding: '1rem',
                                            borderRadius: '6px',
                                            border: '1px solid #E5E7EB'
                                        }}>
                                            <p style={{
                                                margin: 0,
                                                lineHeight: '1.6',
                                                color: '#374151'
                                            }}>
                                                {feedback.comment || feedback.feedback || 'No comment provided.'}
                                            </p>
                                        </div>
                                        
                                        {feedback.suggestions && (
                                            <div style={{
                                                marginTop: '1rem',
                                                padding: '0.75rem',
                                                backgroundColor: '#F0FDF4',
                                                border: '1px solid #BBF7D0',
                                                borderRadius: '6px'
                                            }}>
                                                <div style={{
                                                    fontSize: '0.875rem',
                                                    fontWeight: '600',
                                                    color: '#059669',
                                                    marginBottom: '0.5rem'
                                                }}>💡 Suggestions:</div>
                                                <p style={{
                                                    margin: 0,
                                                    fontSize: '0.875rem',
                                                    color: '#065F46'
                                                }}>
                                                    {feedback.suggestions}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Food;