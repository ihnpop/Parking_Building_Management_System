/**
 * Section wrapper showing a section title and a grid of cards.
 * Props:
 * - title: section heading text
 * - cards: array of { title, description, icon }
 * - columns: number of columns in the grid (hint only — CSS auto-fit handles actual layout)
 */
import DashboardCard from './DashboardCard'

export default function DashboardSection({ title, cards, columns = 3 }) {
    return (
        <section className="section">
            <div className="section-title">{title}</div>
            {/* Luôn dùng card-grid; CSS auto-fit tự chia cột phù hợp viewport */}
            <div className="card-grid">
                {cards.map((card) => (
                    <DashboardCard key={card.title} {...card} />
                ))}
            </div>
        </section>
    )
}