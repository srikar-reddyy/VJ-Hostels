import { useState, useEffect } from 'react';
import Complaints from './Complaints';
import complaintsIcon from '../../assets/complaints.svg';

const ComplaintsLoader = () => {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setLoading(false);
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    if (loading) {
        return (
            <div className="complaints-loader" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <img 
                    src={complaintsIcon} 
                    alt="Loading Complaints..." 
                    className="complaints-icon"
                    style={{ width: '250px', height: 'auto' }}
                />
            </div>
        );
    }

    return <Complaints />;
};

export default ComplaintsLoader;