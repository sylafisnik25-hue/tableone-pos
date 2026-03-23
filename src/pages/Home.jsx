import { Link } from 'react-router-dom'
import { getRestaurantName } from '../config/setup'
import { getCurrentStaff, getCurrentStaffRole } from '../store/staffStore'
import './Home.css'

const PRIMARY_CARDS = [
  {
    title: 'Tables & Orders',
    to: '/tables',
    icon: '🍽',
    subtitle: 'Manage tables & take orders',
    featured: true,
  },
  {
    title: 'Kitchen / Bar',
    to: '/kitchen',
    icon: '👨‍🍳',
    subtitle: 'View live orders',
  },
  {
    title: 'Billing',
    to: '/billing',
    icon: '💳',
    subtitle: 'Payments & receipts',
  },
  {
    title: 'Owner View',
    to: '/owner',
    icon: '📈',
    subtitle: 'Live overview & performance',
  },
]

export default function Home() {
  const role = getCurrentStaffRole()
  const current = getCurrentStaff()
  if (role === 'chef') {
    return (
      <div className="home-page">
        <h1 className="home-title">{getRestaurantName()}</h1>
        <p className="home-subtitle">Chef sign-in</p>
        <div className="home-role-panel">
          <h2>On-shift status</h2>
          <p>
            {current?.name || 'Chef'} is <strong>On shift</strong>.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="home-page">
      <h1 className="home-title">{getRestaurantName()}</h1>
      <p className="home-subtitle">Simple restaurant POS for fast service</p>

      <div className="home-grid">
        {PRIMARY_CARDS.map((card) => (
          <Link
            key={card.title}
            to={card.to}
            className={`home-card ${card.featured ? 'home-card-featured' : ''}`}
          >
            <span className="home-card-icon" aria-hidden>{card.icon}</span>
            <span className="home-card-title">{card.title}</span>
            <span className="home-card-subtitle">{card.subtitle}</span>
          </Link>
        ))}
      </div>
      <div className="home-secondary-actions">
        <Link to="/staff" className="home-secondary-btn">
          Staff
        </Link>
        <Link to="/stock" className="home-secondary-btn">
          Stock
        </Link>
        <button type="button" className="home-secondary-btn home-secondary-btn-danger">
          Sign Out
        </button>
      </div>
    </div>
  )
}
