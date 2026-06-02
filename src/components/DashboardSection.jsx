/**
 * Section wrapper showing a section title and a grid of cards.
 * Props:
 * - title: section heading text
 * - cards: array of { title, description, icon }
 * - columns: number of columns in the grid
 */
import DashboardCard from './DashboardCard'

export default function DashboardSection({ title, cards, columns = 3 }) {
  const gridClass = columns === 4 ? 'card-grid four' : 'card-grid'

  return (
    <section className="section">
      <div className="section-title">{title}</div>
      <div className={gridClass}>
        {cards.map((card) => (
          <DashboardCard key={card.title} {...card} />
        ))}
      </div>
    </section>
  )
}
