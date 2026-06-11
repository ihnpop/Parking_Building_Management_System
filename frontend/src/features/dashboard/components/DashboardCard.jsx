import { useNavigate } from 'react-router-dom';

/**
 * Single dashboard card used in the sample page.
 * Props:
 * - title: card title
 * - description: short description text
 * - icon: material symbol name
 * - path: navigation path when clicked
 * - onClick: custom click handler
 */
export default function DashboardCard({ title, description, icon, path, onClick }) {
    const navigate = useNavigate();

    const handleClick = () => {
        if (onClick) {
            onClick();
        } else if (path) {
            navigate(path);
        }
    };

    const isClickable = !!(path || onClick);

    return (
        <article
            className={`card ${isClickable ? 'clickable' : ''}`}
            onClick={handleClick}
            style={isClickable ? { cursor: 'pointer' } : {}}
        >
            <div className="card-icon">
                <span className="material-symbols-outlined">{icon}</span>
            </div>

            <div>
                <h3>{title}</h3>
                <p className="card-description desc-clamp">{description}</p>
            </div>
        </article>
    )
}