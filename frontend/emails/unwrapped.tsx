import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface UnwrappedEmailProps {
  username?: string;
  year?: number;
  totalMinutesWatched?: number;
  moviesWatched?: number;
  episodesWatched?: number;
  daysActive?: number;
  topMovie?: {
    title: string;
    plays: number;
    poster?: string;
  };
  topShow?: {
    title: string;
    plays: number;
    poster?: string;
  };
  wrappedUrl?: string;
}

export const UnwrappedEmail = ({
  username = 'Movie Lover',
  year = 2024,
  totalMinutesWatched = 0,
  moviesWatched = 0,
  episodesWatched = 0,
  daysActive = 0,
  topMovie = { title: 'The Shawshank Redemption', plays: 5 },
  topShow = { title: 'Breaking Bad', plays: 10 },
  wrappedUrl = '#',
}: UnwrappedEmailProps) => {
  const hours = Math.floor(totalMinutesWatched / 60);
  const days = Math.floor(hours / 24);

  return (
    <Html>
      <Head />
      <Preview>{`Your ${year} Unwrapped for Plex is here! 🎬`}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={h1}>Unwrapped for Plex {year}</Heading>
            <Text style={subtitle}>Hey {username}, your year in entertainment is here!</Text>
          </Section>

          {/* Hero Section */}
          <Section style={heroSection}>
            <div style={statBox}>
              <Text style={statNumber}>{hours.toLocaleString()}</Text>
              <Text style={statLabel}>Hours Watched</Text>
            </div>
            {days > 0 && (
              <Text style={statSubtext}>
                That's {days} full {days === 1 ? 'day' : 'days'} of entertainment!
              </Text>
            )}
          </Section>

          {/* Stats Grid */}
          <Section style={statsGrid}>
            <div style={statCard}>
              <Text style={statCardNumber}>{moviesWatched}</Text>
              <Text style={statCardLabel}>Movies Watched</Text>
            </div>
            <div style={statCard}>
              <Text style={statCardNumber}>{episodesWatched}</Text>
              <Text style={statCardLabel}>Episodes Watched</Text>
            </div>
            <div style={statCard}>
              <Text style={statCardNumber}>{daysActive}</Text>
              <Text style={statCardLabel}>Days Active</Text>
            </div>
          </Section>

          {/* Top Movie */}
          {topMovie && (
            <Section style={contentSection}>
              <Heading style={h2}>Your Top Movie</Heading>
              <div style={mediaCard}>
                <Text style={mediaTitle}>{topMovie.title}</Text>
                <Text style={mediaSubtitle}>Watched {topMovie.plays} times</Text>
              </div>
            </Section>
          )}

          {/* Top Show */}
          {topShow && (
            <Section style={contentSection}>
              <Heading style={h2}>Your Top Show</Heading>
              <div style={mediaCard}>
                <Text style={mediaTitle}>{topShow.title}</Text>
                <Text style={mediaSubtitle}>Watched {topShow.plays} times</Text>
              </div>
            </Section>
          )}

          {/* CTA */}
          <Section style={ctaSection}>
            <Text style={ctaText}>
              See your complete {year} wrapped stats
            </Text>
            <Button style={button} href={wrappedUrl}>
              View Your Unwrapped
            </Button>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Generated with Unwrapped for Plex
            </Text>
            <Text style={footerText}>
              <Link href={wrappedUrl} style={footerLink}>
                View in browser
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default UnwrappedEmail;

// Styles
const main = {
  backgroundColor: '#0a0a0a',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '600px',
};

const header = {
  padding: '40px 20px',
  textAlign: 'center' as const,
  background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
  borderRadius: '12px 12px 0 0',
};

const h1 = {
  color: '#0a0a0a',
  fontSize: '42px',
  fontWeight: '900',
  margin: '0 0 10px',
  lineHeight: '1.2',
};

const subtitle = {
  color: '#0a0a0a',
  fontSize: '18px',
  margin: '0',
  fontWeight: '500',
};

const heroSection = {
  padding: '40px 20px',
  textAlign: 'center' as const,
  backgroundColor: '#141414',
};

const statBox = {
  marginBottom: '16px',
};

const statNumber = {
  color: '#ff6b35',
  fontSize: '72px',
  fontWeight: '900',
  margin: '0',
  lineHeight: '1',
};

const statLabel = {
  color: '#ffffff',
  fontSize: '20px',
  margin: '8px 0 0',
  fontWeight: '600',
};

const statSubtext = {
  color: '#a0a0a0',
  fontSize: '16px',
  margin: '16px 0 0',
};

const statsGrid = {
  padding: '20px',
  display: 'flex',
  gap: '16px',
  backgroundColor: '#141414',
};

const statCard = {
  flex: 1,
  padding: '24px 16px',
  backgroundColor: '#1f1f1f',
  borderRadius: '8px',
  textAlign: 'center' as const,
  border: '1px solid #2a2a2a',
};

const statCardNumber = {
  color: '#ffffff',
  fontSize: '32px',
  fontWeight: '700',
  margin: '0',
};

const statCardLabel = {
  color: '#a0a0a0',
  fontSize: '14px',
  margin: '8px 0 0',
};

const contentSection = {
  padding: '32px 20px',
  backgroundColor: '#141414',
};

const h2 = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0 0 16px',
};

const mediaCard = {
  padding: '24px',
  backgroundColor: '#1f1f1f',
  borderRadius: '8px',
  border: '1px solid #2a2a2a',
};

const mediaTitle = {
  color: '#ffffff',
  fontSize: '20px',
  fontWeight: '600',
  margin: '0 0 8px',
};

const mediaSubtitle = {
  color: '#a0a0a0',
  fontSize: '16px',
  margin: '0',
};

const ctaSection = {
  padding: '40px 20px',
  textAlign: 'center' as const,
  backgroundColor: '#141414',
};

const ctaText = {
  color: '#ffffff',
  fontSize: '18px',
  margin: '0 0 24px',
  fontWeight: '600',
};

const button = {
  backgroundColor: '#ff6b35',
  borderRadius: '8px',
  color: '#0a0a0a',
  fontSize: '16px',
  fontWeight: '700',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
  border: 'none',
  cursor: 'pointer',
};

const footer = {
  padding: '24px 20px',
  textAlign: 'center' as const,
  backgroundColor: '#141414',
  borderRadius: '0 0 12px 12px',
};

const footerText = {
  color: '#666666',
  fontSize: '14px',
  margin: '8px 0',
};

const footerLink = {
  color: '#ff6b35',
  textDecoration: 'none',
};
