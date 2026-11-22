import '../styles/DonorBadges.css';
import { useState } from 'react';

const BADGES_PER_PAGE = 6;

async function createBadgeBlob(badge, donorName) {
  const image = new Image();
  image.src = `/donor-badges/${badge.image}`;
  await image.decode();

  const footerHeight = badge.dateLabel ? 380 : 300;
  const canvas = document.createElement('canvas');

  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight + footerHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create badge image.');

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Badge image
  ctx.drawImage(image, 0, 0);

  // Award section
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

  if (badge.dateLabel) {
      ctx.fillStyle = '#fda4af';
      ctx.font = '500 45px Arial';
      ctx.fillText(
          badge.dateLabel,
          canvas.width / 2,
          image.naturalHeight + 305,
          canvas.width - 160
      );
  }

  return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
          if (blob) {
              resolve(blob);
          } else {
              reject(new Error('Could not create badge image.'));
          }
      }, 'image/png');
  });
}


async function downloadBadge(badge, donorName) {
  try {
      const blob = await createBadgeBlob(badge, donorName);
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.download = `Sandugo-${badge.id}-badge.png`;
      link.href = url;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
  } catch (error) {
      console.error('Badge download failed:', error);
      alert('Unable to download badge. Please try again.');
  }
}



function shareToFacebook() {
  window.open(
    'https://www.facebook.com/',
    '_blank'
  );
}

function shareToX() {
  window.open(
    'https://x.com/',
    '_blank',
    'width=650,height=600'
  );
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
];



const donationDateFormat = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'medium',
  timeZone: 'Asia/Manila',
});

export default function DonorBadges({
    totalDonations = 0,
    donationBadges = [],
    donorName = '',
  }) {
  
  const nextBadge = BADGES.find(badge => totalDonations < badge.required);

  const datedBadges = donationBadges.map(({ id, donatedAt }) => ({
    id: `donation-${id}`,
    name: 'I Donated Blood',
    image: '7.png',
    dateLabel: donationDateFormat.format(new Date(donatedAt)),
  }));

  const unlockedMilestones = BADGES
  .filter(badge => totalDonations >= badge.required)
  .map(badge => {
    // The API sends donations newest first, so count from the end.
    const donatedAt = donationBadges.at(-badge.required)?.donatedAt;
    const timestamp = Date.parse(donatedAt);

    return {
      ...badge,
      dateLabel: Number.isFinite(timestamp)
        ? `Earned ${donationDateFormat.format(timestamp)}`
        : undefined,
    };
  });
  const lockedMilestones = BADGES.filter(
    badge => totalDonations < badge.required
  );
  
  const displayedBadges = [
    ...unlockedMilestones,
    ...datedBadges,
    ...lockedMilestones,
  ];

const [visibleCount, setVisibleCount] = useState(BADGES_PER_PAGE);
const [shareBadgeId, setShareBadgeId] = useState(null);
const visibleBadges = displayedBadges.slice(0, visibleCount);
const remainingCount = displayedBadges.length - visibleBadges.length;

  return (
    <section className="donor-badges">
      <div className="donor-badges-header">
        <div>
          <h2 className="ui-section-title">My Badges</h2>
          <p className="ui-section-help">
            View and download your donation and milestone badges.
          </p>
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
      {visibleBadges.map(badge => {
      const unlocked = Boolean(badge.dateLabel) || totalDonations >= badge.required;
            
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
                {badge.dateLabel ||
                  `${badge.required} donation${badge.required === 1 ? '' : 's'}`}
              </p>

              <div className="donor-badge-footer">
            <span className="donor-badge-status">
                {unlocked ? 'Unlocked' : 'Locked'}
            </span>

            {unlocked && (
    <>
       <div className="donor-badge-share-wrapper">
  <button
    type="button"
    className="donor-badge-share"
    onClick={() =>
      setShareBadgeId(current =>
        current === badge.id ? null : badge.id
      )
    }
    title="Share badge"
    aria-label={`Share ${badge.name} badge`}
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
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 10.7 6.8-4" />
      <path d="m8.6 13.3 6.8 4" />
    </svg>
  </button>

  {shareBadgeId === badge.id && (
    <div className="donor-badge-share-menu">
      <p className="donor-badge-share-title">
        Share badge
      </p>

      <button
            type="button"
            className="donor-badge-social-option facebook"
            onClick={() => {
              shareToFacebook(badge);
              setShareBadgeId(null);
            }}
          >
            <span className="social-icon facebook-icon">f</span>
            Facebook
          </button>

          <button
            type="button"
            className="donor-badge-social-option x"
            onClick={() => {
              shareToX(badge);
              setShareBadgeId(null);
            }}
          >
            <span className="social-icon x-icon">𝕏</span>
            X
          </button>
        </div>
      )}
    </div>

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
    </>
)}
    </div>
            </article>
          );
        })}
      </div>

      {displayedBadges.length > BADGES_PER_PAGE && (
        <div className="flex flex-wrap items-center justify-center gap-3" style={{ marginTop: '1rem' }}>
          {remainingCount > 0 && (
            <button
              type="button"
              className="appointment-view-button"
              onClick={() => setVisibleCount(count => count + BADGES_PER_PAGE)}
            >
              Show more ({remainingCount})
            </button>
          )}

          {visibleCount > BADGES_PER_PAGE && (
            <button
              type="button"
              className="appointment-view-button"
              onClick={() => setVisibleCount(BADGES_PER_PAGE)}
            >
              Show less
            </button>
          )}
        </div>
      )}
    </section>
  );
}