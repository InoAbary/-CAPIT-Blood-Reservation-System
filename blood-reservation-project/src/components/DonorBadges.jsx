import '../styles/DonorBadges.css';

const BADGES = [
  {
    id: 'first',
    name: 'First-Time Donor',
    required: 1,
    image: '1.png',
  },
  {
    id: 'galloneer',
    name: 'Galloneer',
    required: 8,
    image: '2.png',
  },
  {
    id: 'bronze',
    name: 'Bronze Milestone',
    required: 25,
    image: '3.png',
  },
  {
    id: 'silver',
    name: 'Silver Milestone',
    required: 40,
    image: '4.png',
  },
  {
    id: 'gold',
    name: 'Gold Milestone',
    required: 50,
    image: '5.png',
  },
  {
    id: 'century',
    name: 'Century Donor',
    required: 100,
    image: '6.png',
  },
  {
    id: 'today',
    name: 'I Donated Blood Today!',
    daily: true,
    image: '7.png',
  },
];

export default function DonorBadges({
  totalDonations = 0,
  donatedToday = false,
}) {
  const nextBadge = BADGES.find(
    badge => !badge.daily && totalDonations < badge.required
  );

  return (
    <section className="donor-badges">
      <div className="donor-badges-header">
        <div>
          <h2>My Badges</h2>
          <p>Achievements earned through your blood donations.</p>
        </div>

        <span className="donor-badges-count">
          {totalDonations} donation{totalDonations === 1 ? '' : 's'}
        </span>
      </div>

      <p className="donor-badges-progress">
        {nextBadge
          ? `${nextBadge.required - totalDonations} more donation(s) to unlock ${nextBadge.name}.`
          : 'Congratulations! You have reached every donation milestone.'}
      </p>

      <div className="donor-badges-grid">
        {BADGES.map(badge => {
          const unlocked = badge.daily
            ? donatedToday
            : totalDonations >= badge.required;

          return (
            <article
              key={badge.id}
              className={`donor-badge ${unlocked ? 'unlocked' : 'locked'}`}
            >
              <img
                src={`/donor-badges/${badge.image}`}
                alt={`${badge.name} badge`}
                loading="lazy"
              />

              <h3>{badge.name}</h3>

              <p>
                {badge.daily
                  ? 'Donate blood today'
                  : `${badge.required} donation${badge.required === 1 ? '' : 's'}`}
              </p>

              <span className="donor-badge-status">
                {unlocked ? '✓ Unlocked' : 'Locked'}
              </span>
            </article>
          );
        })}
      </div>
    </section>
  );
}