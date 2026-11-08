import '../styles/DonorBadges.css';

async function downloadBadge(badge, donorName) {
    try {
        const image = new Image();
        image.src = `/donor-badges/${badge.image}`;
        await image.decode();

        const footerHeight = 300;
        const canvas = document.createElement('canvas');

        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight + footerHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not create badge image.');

        // Original badge
        ctx.drawImage(image, 0, 0);

        // Name section
        ctx.fillStyle = '#881337';
        ctx.fillRect(
            0,
            image.naturalHeight,
            canvas.width,
            footerHeight
        );

        ctx.textAlign = 'center';

        ctx.fillStyle = '#fda4af';
        ctx.font = '500 45px Arial';
        ctx.fillText(
            'AWARDED TO',
            canvas.width / 2,
            image.naturalHeight + 95
        );

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 90px Arial';
        ctx.fillText(
            donorName || 'Sandugo Donor',
            canvas.width / 2,
            image.naturalHeight + 205,
            canvas.width - 160
        );

        // Download PNG
        const link = document.createElement('a');
        link.download = `Sandugo-${badge.id}-badge.png`;
        link.href = canvas.toDataURL('image/png');

        document.body.appendChild(link);
        link.click();
        link.remove();

    } catch (error) {
        console.error('Badge download failed:', error);
        alert('Unable to download badge. Please try again.');
    }
}

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
    donorName = '',
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

              <div className="donor-badge-footer">
    <span className="donor-badge-status">
        {unlocked ? '✓ Unlocked' : 'Locked'}
    </span>

    {unlocked && (
        <button
            type="button"
            className="donor-badge-download"
            onClick={() => downloadBadge(badge, donorName)}
            title="Download personalized badge"
            aria-label={`Download ${badge.name} badge`}
        >
            <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
            >
                <path d="M12 3v12" />
                <path d="m7 10 5 5 5-5" />
                <path d="M5 17v4h14v-4" />
            </svg>
        </button>
    )}
</div>
            </article>
          );
        })}
      </div>
    </section>
  );
}