'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { motion, useInView } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import LanguageSwitcher from '@/components/LanguageSwitcher';

interface WrappedData {
  user: {
    username: string;
    friendly_name: string;
    thumb: string;
  };
  year: number;
  stats: {
    totalWatchTimeMinutes: number;
    totalPlays: number;
    totalMovies: number;
    totalTvEpisodes: number;
    uniqueMovies: number;
    uniqueShows: number;
    daysActive: number;
    mostActiveMonth: string;
    mostActiveDayOfWeek: string;
    mostActiveHour: number;
    longestStreakDays: number;
    longestBingeMinutes: number;
    longestBingeShow: string;
    topMovies: Array<{
      title: string;
      year: number;
      plays: number;
      thumb: string;
      ratingKey: number;
      durationMinutes: number;
    }>;
    topShows: Array<{
      title: string;
      plays: number;
      episodes: number;
      ratingKey: number;
      durationMinutes: number;
    }>;
    topEpisodes: Array<{
      show: string;
      title: string;
      plays: number;
      thumb: string;
      season: number;
      episode: number;
    }>;
    topGenres: Array<any>;
    topActors: Array<any>;
    topDirectors: Array<any>;
    topDevices: Array<{
      device: string;
      platform: string;
      plays: number;
      minutes: number;
    }>;
    topPlatforms: Array<{
      platform: string;
      plays: number;
      minutes: number;
    }>;
    qualityStats: {
      transcode: number;
      directPlay: number;
      directStream: number;
      resolutions: {
        [key: string]: number;
      };
    };
    monthlyStats: Array<{
      month: string;
      monthName: string;
      plays: number;
      minutes: number;
    }>;
    percentageOfLibraryWatched: string;
    totalSeasonsCompleted: number;
    rewatches: number;
    firstWatchTitle: string;
    firstWatchDate: string;
    lastWatchTitle: string;
    lastWatchDate: string;
    mostMemorableDayDate: string;
    mostMemorableDayMinutes: number;
    funFacts: string[];
    badges: Array<{
      name: string;
      description: string;
      icon: string;
    }>;
  };
  generatedAt: string;
}

// Animated Counter Component
function AnimatedCounter({ value, duration = 2 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  useEffect(() => {
    if (!isInView) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = (timestamp - startTime) / (duration * 1000);

      if (progress < 1) {
        setCount(Math.floor(value * progress));
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(value);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [isInView, value, duration]);

  return <span ref={ref}>{count.toLocaleString()}</span>;
}

export default function WrappedPage() {
  const params = useParams();
  const token = params.token as string;
  const t = useTranslations('wrapped');
  const [data, setData] = useState<WrappedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const formatHours = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) {
      const remainingHours = hours % 24;
      return remainingHours > 0
        ? t('time.duration.daysHours', { days, hours: remainingHours })
        : t('time.duration.days', { days });
    }
    return t('time.duration.hours', { hours });
  };

  const formatTime = (hour: number) => {
    if (hour === 0) return t('time.hour.am', { hour: 12 });
    if (hour < 12) return t('time.hour.am', { hour });
    if (hour === 12) return t('time.hour.pm', { hour: 12 });
    return t('time.hour.pm', { hour: hour - 12 });
  };

  const getTautulliImageUrl = (thumb: string) => {
    if (!thumb) return '';
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    return `${apiUrl}/api/wrapped/plex-image?path=${encodeURIComponent(thumb)}`;
  };

  useEffect(() => {
    loadWrappedStats();
  }, []);

  const loadWrappedStats = async () => {
    try {
      const stats: any = await api.getWrappedStats(token);
      setData(stats);
    } catch (err: any) {
      setError(err.message || 'Failed to load wrapped stats');
    } finally {
      setLoading(false);
    }
  };

  // Update metadata when data loads
  useEffect(() => {
    if (!data) return;

    const { user, year, stats } = data;
    const displayName = user.friendly_name || user.username;
    const totalHours = Math.floor(stats.totalWatchTimeMinutes / 60);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3222';

    // Update page title
    document.title = `${displayName}'s ${year} Wrapped - Unwrapped for Plex`;

    // Create or update meta tags
    const updateMetaTag = (property: string, content: string, isProperty = true) => {
      const attribute = isProperty ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attribute}="${property}"]`);

      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, property);
        document.head.appendChild(meta);
      }

      meta.setAttribute('content', content);
    };

    // Basic meta tags
    const description = `${displayName} watched ${totalHours} hours across ${stats.uniqueMovies} movies and ${stats.uniqueShows} shows in ${year}. Check out their year in entertainment!`;
    updateMetaTag('description', description, false);

    // Open Graph tags for Facebook/LinkedIn
    updateMetaTag('og:title', `${displayName}'s ${year} Wrapped`);
    updateMetaTag('og:description', description);
    updateMetaTag('og:type', 'website');
    updateMetaTag('og:url', `${appUrl}/wrapped/${token}`);
    updateMetaTag('og:site_name', 'Unwrapped for Plex');

    // If user has a top movie with thumbnail, use it as og:image
    if (stats.topMovies[0]?.thumb) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const imageUrl = `${apiUrl}/api/wrapped/plex-image?path=${encodeURIComponent(stats.topMovies[0].thumb)}`;
      updateMetaTag('og:image', imageUrl);
      updateMetaTag('og:image:alt', `${stats.topMovies[0].title} poster`);
    }

    // Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image', false);
    updateMetaTag('twitter:title', `${displayName}'s ${year} Wrapped`, false);
    updateMetaTag('twitter:description', description, false);

    if (stats.topMovies[0]?.thumb) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const imageUrl = `${apiUrl}/api/wrapped/plex-image?path=${encodeURIComponent(stats.topMovies[0].thumb)}`;
      updateMetaTag('twitter:image', imageUrl, false);
    }

    // Theme color
    updateMetaTag('theme-color', '#ff6b35', false);
    updateMetaTag('msapplication-TileColor', '#ff6b35', false);

    // Additional useful tags
    updateMetaTag('author', 'Unwrapped for Plex', false);
    updateMetaTag('keywords', `plex, wrapped, ${year}, movies, tv shows, streaming, entertainment, ${displayName}`, false);
  }, [data, token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;700&display=swap');
        `}</style>
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative w-24 h-24 mx-auto">
            <motion.div
              className="absolute inset-0 border-4 border-[#ff6b35] rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              style={{ borderTopColor: 'transparent' }}
            />
          </div>
          <motion.p
            className="text-[#e8e8e8] mt-6 font-['DM_Sans'] text-base font-medium"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {t('loading')}
          </motion.p>
        </motion.div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4">
        <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;700&display=swap');
        `}</style>
        <motion.div
          className="text-center max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-8xl mb-6 font-['Bebas_Neue'] text-[#ff6b35]">{t('error.notFound')}</div>
          <p className="text-[#e8e8e8] mb-8 font-['DM_Sans'] text-base">
            {error || t('error.invalidLink')}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-[#ff6b35] text-[#0a0a0a] font-['Bebas_Neue'] text-xl tracking-wider hover:bg-[#ff8555] transition-all hover:scale-105"
          >
            {t('error.tryAgain')}
          </button>
        </motion.div>
      </div>
    );
  }

  const { user, year, stats } = data;
  const displayName = user.friendly_name || user.username;
  const totalHours = Math.floor(stats.totalWatchTimeMinutes / 60);

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;700&display=swap');

        * {
          scroll-behavior: smooth;
        }

        body {
          overflow-x: hidden;
        }
      `}</style>

      <div className="bg-[#0a0a0a] snap-y snap-mandatory h-screen overflow-y-scroll">
        {/* Language Switcher */}
        <LanguageSwitcher />

        {/* Slide 1: Welcome */}
        <section className="snap-start min-h-screen flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#ff6b35_0%,transparent_70%)] opacity-10" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,#f7931e_0%,transparent_50%)] opacity-5" />

          <motion.div
            className="text-center z-10 px-6"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="mb-8"
            >
              <div className="font-['DM_Sans'] text-[#ff6b35] text-base font-medium tracking-[0.2em] mb-4">
                {displayName.toUpperCase()}
              </div>
              <h1 className="font-['Bebas_Neue'] text-7xl md:text-9xl text-[#e8e8e8] tracking-wider">
                {t('welcome.yourYear', { year })}
              </h1>
              <h2 className="font-['Bebas_Neue'] text-5xl md:text-7xl text-[#ff6b35] tracking-wider mt-2">
                {t('welcome.wrapped')}
              </h2>
            </motion.div>

            <motion.p
              className="font-['DM_Sans'] text-[#888] text-base max-w-md mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              {t('welcome.subtitle')}
            </motion.p>

            <motion.div
              className="mt-12"
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <svg className="w-6 h-6 mx-auto text-[#ff6b35]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </motion.div>
          </motion.div>
        </section>

        {/* Slide 2: Total Watch Time */}
        <section className="snap-start min-h-screen flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[conic-gradient(from_180deg_at_50%_50%,#0a0a0a_0deg,#ff6b35_60deg,#0a0a0a_120deg)] opacity-5" />

          <motion.div
            className="text-center px-6"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6 }}
          >
            <motion.p
              className="font-['DM_Sans'] text-[#888] text-sm mb-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              {t('totalWatchTime.youSpent')}
            </motion.p>

            <motion.div
              className="relative inline-block"
              initial={{ scale: 0.5, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, type: "spring", stiffness: 100 }}
            >
              <div className="absolute inset-0 bg-[#ff6b35] blur-[100px] opacity-30" />
              <h2 className="font-['Bebas_Neue'] text-8xl md:text-[12rem] text-[#e8e8e8] relative">
                <AnimatedCounter value={totalHours} />
              </h2>
            </motion.div>

            <motion.p
              className="font-['Bebas_Neue'] text-4xl md:text-6xl text-[#ff6b35] mt-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.8 }}
            >
              {t('totalWatchTime.hoursWatching')}
            </motion.p>

            <motion.p
              className="font-['DM_Sans'] text-[#888] text-sm mt-8"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 1.2 }}
            >
              {t('totalWatchTime.daysOfEntertainment', { days: Math.floor(totalHours / 24) })}
            </motion.p>
          </motion.div>
        </section>

        {/* Slide 3: Movies vs Shows */}
        <section className="snap-start min-h-screen flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(45deg,#0a0a0a_25%,#1a1a1a_25%,#1a1a1a_50%,#0a0a0a_50%,#0a0a0a_75%,#1a1a1a_75%,#1a1a1a)] bg-[length:20px_20px] opacity-20" />

          <motion.div
            className="max-w-4xl w-full px-6"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.3 }}
          >
            <motion.h2
              className="font-['Bebas_Neue'] text-5xl md:text-7xl text-[#e8e8e8] text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              {t('numbers.title')}
            </motion.h2>

            <div className="grid md:grid-cols-2 gap-8 md:gap-12">
              <motion.div
                className="text-center p-8 rounded-lg bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-[#333]"
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                whileHover={{ scale: 1.05, borderColor: '#ff6b35' }}
              >
                <div className="text-6xl md:text-7xl font-['Bebas_Neue'] text-[#ff6b35] mb-2">
                  <AnimatedCounter value={stats.uniqueMovies} />
                </div>
                <div className="font-['Bebas_Neue'] text-2xl text-[#e8e8e8]">{t('numbers.movies')}</div>
                <div className="font-['DM_Sans'] text-base text-[#888] mt-2">
                  {t('numbers.totalPlays', { count: stats.totalMovies })}
                </div>
              </motion.div>

              <motion.div
                className="text-center p-8 rounded-lg bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-[#333]"
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                whileHover={{ scale: 1.05, borderColor: '#f7931e' }}
              >
                <div className="text-6xl md:text-7xl font-['Bebas_Neue'] text-[#f7931e] mb-2">
                  <AnimatedCounter value={stats.uniqueShows} />
                </div>
                <div className="font-['Bebas_Neue'] text-2xl text-[#e8e8e8]">{t('numbers.tvShows')}</div>
                <div className="font-['DM_Sans'] text-base text-[#888] mt-2">
                  {t('numbers.episodesWatched', { count: stats.totalTvEpisodes })}
                </div>
              </motion.div>
            </div>

            <motion.div
              className="mt-12 text-center p-8 rounded-lg bg-gradient-to-r from-[#1a1a1a] via-[#0a0a0a] to-[#1a1a1a] border border-[#333]"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
            >
              <div className="flex items-center justify-center gap-4">
                <div className="font-['Bebas_Neue'] text-5xl text-[#e8e8e8]">
                  <AnimatedCounter value={stats.daysActive} />
                </div>
                <div className="font-['Bebas_Neue'] text-2xl text-[#888]">{t('numbers.daysActive')}</div>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* Slide 4: Top TV Shows */}
        {stats.topShows.length > 0 && (
          <section className="snap-start min-h-screen flex items-center justify-center py-20 px-6">
            <motion.div
              className="max-w-5xl w-full"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.2 }}
            >
              <motion.h2
                className="font-['Bebas_Neue'] text-5xl md:text-7xl text-[#e8e8e8] text-center mb-12"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                {t('topShows.title')}
              </motion.h2>

              <div className="space-y-4">
                {stats.topShows.slice(0, 5).map((show, index) => (
                  <motion.div
                    key={show.ratingKey}
                    className="relative overflow-hidden rounded-lg bg-gradient-to-r from-[#1a1a1a] to-[#0a0a0a] border border-[#333] p-6 hover:border-[#f7931e] transition-all"
                    initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.15 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-[#f7931e] to-[#ff6b35] flex items-center justify-center">
                          <span className="font-['Bebas_Neue'] text-2xl text-[#0a0a0a]">{index + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-['Bebas_Neue'] text-2xl text-[#e8e8e8] truncate">{show.title}</div>
                          <div className="font-['DM_Sans'] text-base text-[#888] mt-1">
                            {t('topShows.episodes', { count: show.episodes })} • {t('topShows.duration', { duration: formatHours(show.durationMinutes) })}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-['Bebas_Neue'] text-3xl text-[#f7931e]">
                          {show.plays}
                        </div>
                        <div className="font-['DM_Sans'] text-base text-[#888]">{t('topShows.plays')}</div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {stats.topShows[0] && stats.topShows[0].episodes > 50 && (
                <motion.p
                  className="text-center font-['DM_Sans'] text-base text-[#888] mt-8"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 1 }}
                >
                  {t('topShows.watchedEpisodes', { count: stats.topShows[0].episodes, title: stats.topShows[0].title })}
                </motion.p>
              )}
            </motion.div>
          </section>
        )}

        {/* Slide 5: Top Movies */}
        {stats.topMovies.length > 0 && (
          <section className="snap-start min-h-screen flex items-center justify-center py-20 px-6">
            <motion.div
              className="max-w-7xl w-full"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.2 }}
            >
              <motion.h2
                className="font-['Bebas_Neue'] text-5xl md:text-7xl text-[#e8e8e8] text-center mb-12"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                {t('topMovies.title')}
              </motion.h2>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {stats.topMovies.slice(0, 10).map((movie, index) => (
                  <motion.div
                    key={movie.ratingKey}
                    className="relative group"
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.05, zIndex: 10 }}
                  >
                    <div className="aspect-[2/3] bg-[#1a1a1a] border-2 border-[#333] overflow-hidden relative group-hover:border-[#ff6b35] transition-all duration-300 rounded-lg">
                      {movie.thumb && (
                        <motion.img
                          src={getTautulliImageUrl(movie.thumb)}
                          alt={movie.title}
                          className="w-full h-full object-cover"
                          whileHover={{ scale: 1.1 }}
                          transition={{ duration: 0.3 }}
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent">
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <div className="font-['Bebas_Neue'] text-base md:text-lg text-[#e8e8e8] leading-tight line-clamp-2">
                            {movie.title}
                          </div>
                          <div className="font-['DM_Sans'] text-sm text-[#ff6b35] mt-1">
                            {t('topMovies.playsCount', { count: movie.plays })}
                          </div>
                        </div>
                      </div>
                      <motion.div
                        className="absolute top-3 right-3 bg-[#ff6b35] text-[#0a0a0a] font-['Bebas_Neue'] text-2xl px-3 py-1 rounded"
                        initial={{ scale: 0, rotate: -180 }}
                        whileInView={{ scale: 1, rotate: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1 + 0.3, type: "spring" }}
                      >
                        {index + 1}
                      </motion.div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </section>
        )}

        {/* Slide 7: Monthly Journey */}
        {stats.monthlyStats && stats.monthlyStats.length > 0 && (
          <section className="snap-start min-h-screen flex items-center justify-center py-20 px-6">
            <motion.div
              className="max-w-6xl w-full"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.2 }}
            >
              <motion.h2
                className="font-['Bebas_Neue'] text-5xl md:text-7xl text-[#e8e8e8] text-center mb-4"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                {t('monthlyJourney.title')}
              </motion.h2>

              <motion.p
                className="font-['DM_Sans'] text-base text-[#888] text-center mb-12"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
              >
                {t('monthlyJourney.peakMonth', { month: stats.mostActiveMonth })}
              </motion.p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats.monthlyStats.map((month, index) => {
                  const isTopMonth = month.monthName === stats.mostActiveMonth;
                  return (
                    <motion.div
                      key={month.month}
                      className={`p-6 rounded-lg border ${
                        isTopMonth
                          ? 'bg-gradient-to-br from-[#ff6b35]/20 to-[#f7931e]/20 border-[#ff6b35]'
                          : 'bg-[#1a1a1a] border-[#333]'
                      }`}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.05 }}
                    >
                      <div className="text-center">
                        <div className={`font-['Bebas_Neue'] text-sm mb-2 ${
                          isTopMonth ? 'text-[#ff6b35]' : 'text-[#888]'
                        }`}>
                          {month.monthName}
                        </div>
                        <div className="font-['Bebas_Neue'] text-3xl text-[#e8e8e8] mb-1">
                          {month.plays}
                        </div>
                        <div className="font-['DM_Sans'] text-base text-[#888]">
                          {formatHours(month.minutes)}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </section>
        )}

        {/* Slide 8: Where You Watched */}
        {stats.topDevices && stats.topDevices.length > 0 && (
          <section className="snap-start min-h-screen flex items-center justify-center py-20 px-6">
            <motion.div
              className="max-w-4xl w-full"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.3 }}
            >
              <motion.h2
                className="font-['Bebas_Neue'] text-5xl md:text-7xl text-[#e8e8e8] text-center mb-12"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                {t('devices.title')}
              </motion.h2>

              <div className="space-y-4">
                {stats.topDevices.slice(0, 3).map((device, index) => {
                  const percentage = Math.round((device.minutes / stats.totalWatchTimeMinutes) * 100);
                  return (
                    <motion.div
                      key={index}
                      className="relative"
                      initial={{ opacity: 0, x: -50 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.2 }}
                    >
                      <div className="p-6 rounded-lg bg-[#1a1a1a] border border-[#333] relative overflow-hidden">
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-[#ff6b35]/10 to-transparent"
                          initial={{ width: 0 }}
                          whileInView={{ width: `${percentage}%` }}
                          viewport={{ once: true }}
                          transition={{ delay: index * 0.2 + 0.3, duration: 1 }}
                        />
                        <div className="relative z-10 flex items-center justify-between">
                          <div>
                            <div className="font-['Bebas_Neue'] text-2xl text-[#e8e8e8]">{device.device}</div>
                            <div className="font-['DM_Sans'] text-base text-[#888]">
                              {t('devices.platform', { platform: device.platform })} • {t('devices.hours', { hours: formatHours(device.minutes) })}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-['Bebas_Neue'] text-3xl text-[#ff6b35]">{percentage}%</div>
                            <div className="font-['DM_Sans'] text-base text-[#888]">{device.plays} {t('devices.plays')}</div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </section>
        )}

        {/* Slide 9: Most Memorable Day */}
        {stats.mostMemorableDayDate && stats.mostMemorableDayMinutes > 0 && (
          <section className="snap-start min-h-screen flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#ff6b35_0%,transparent_60%)] opacity-10" />

            <motion.div
              className="text-center px-6"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.6 }}
            >
              <motion.p
                className="font-['DM_Sans'] text-[#888] text-sm mb-8"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                {t('memorableDay.title')}
              </motion.p>

              <motion.div
                className="mb-6"
                initial={{ scale: 0.5, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4, type: "spring", stiffness: 100 }}
              >
                <div className="font-['Bebas_Neue'] text-5xl md:text-7xl text-[#ff6b35]">
                  {new Date(stats.mostMemorableDayDate).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </motion.div>

              <motion.div
                className="relative inline-block"
                initial={{ scale: 0.5, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6, type: "spring", stiffness: 100 }}
              >
                <div className="absolute inset-0 bg-[#ff6b35] blur-[80px] opacity-20" />
                <h2 className="font-['Bebas_Neue'] text-7xl md:text-9xl text-[#e8e8e8] relative">
                  {formatHours(stats.mostMemorableDayMinutes)}
                </h2>
              </motion.div>

              <motion.p
                className="font-['DM_Sans'] text-[#888] text-sm mt-8"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 1 }}
              >
                {t('memorableDay.subtitle')}
              </motion.p>
            </motion.div>
          </section>
        )}

        {/* Slide 10: First & Last */}
        {(stats.firstWatchTitle || stats.lastWatchTitle) && (
          <section className="snap-start min-h-screen flex items-center justify-center px-6 py-20">
            <motion.div
              className="max-w-4xl w-full"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.3 }}
            >
              <motion.h2
                className="font-['Bebas_Neue'] text-5xl md:text-7xl text-[#e8e8e8] text-center mb-16"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                {t('fullCircle.title')}
              </motion.h2>

              <div className="space-y-8">
                {stats.firstWatchTitle && (
                  <motion.div
                    className="p-8 rounded-lg bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-[#333]"
                    initial={{ opacity: 0, x: -50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="font-['DM_Sans'] text-base text-[#888] mb-3">{t('fullCircle.firstWatch')}</div>
                    <div className="font-['Bebas_Neue'] text-4xl text-[#ff6b35] mb-2">{stats.firstWatchTitle}</div>
                    <div className="font-['DM_Sans'] text-base text-[#888]">
                      {new Date(stats.firstWatchDate).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                  </motion.div>
                )}

                {stats.lastWatchTitle && (
                  <motion.div
                    className="p-8 rounded-lg bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-[#333]"
                    initial={{ opacity: 0, x: 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 }}
                  >
                    <div className="font-['DM_Sans'] text-base text-[#888] mb-3">{t('fullCircle.lastWatch')}</div>
                    <div className="font-['Bebas_Neue'] text-4xl text-[#f7931e] mb-2">{stats.lastWatchTitle}</div>
                    <div className="font-['DM_Sans'] text-base text-[#888]">
                      {new Date(stats.lastWatchDate).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                  </motion.div>
                )}
              </div>

              {stats.rewatches > 0 && (
                <motion.div
                  className="mt-8 text-center p-6 rounded-lg bg-gradient-to-r from-[#1a1a1a] via-[#0a0a0a] to-[#1a1a1a] border border-[#333]"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.7 }}
                >
                  <div className="font-['DM_Sans'] text-base text-[#888] mb-2">{t('fullCircle.comfortRewatches')}</div>
                  <div className="font-['Bebas_Neue'] text-5xl text-[#e8e8e8]">{stats.rewatches}</div>
                  <div className="font-['DM_Sans'] text-base text-[#888] mt-2">
                    {t('fullCircle.classicsHitDifferent')}
                  </div>
                </motion.div>
              )}
            </motion.div>
          </section>
        )}

        {/* Slide 11: Binge Stats */}
        <section className="snap-start min-h-screen flex items-center justify-center relative overflow-hidden px-6">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,#ff6b35_0%,transparent_50%)] opacity-10" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,#f7931e_0%,transparent_50%)] opacity-10" />
          </div>

          <motion.div
            className="max-w-4xl w-full relative z-10"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.3 }}
          >
            <motion.h2
              className="font-['Bebas_Neue'] text-5xl md:text-7xl text-[#e8e8e8] text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              {t('peakPerformance.title')}
            </motion.h2>

            <div className="space-y-8">
              <motion.div
                className="p-8 rounded-lg bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-[#333]"
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="font-['DM_Sans'] text-base text-[#888] mb-2">{t('peakPerformance.longestStreak')}</div>
                    <div className="font-['Bebas_Neue'] text-4xl text-[#ff6b35]">
                      {t('peakPerformance.longestStreakDays', { days: stats.longestStreakDays })}
                    </div>
                  </div>
                  <div className="font-['DM_Sans'] text-sm text-[#e8e8e8]">
                    {t('peakPerformance.couldntStop')}
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="p-8 rounded-lg bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-[#333]"
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="font-['DM_Sans'] text-base text-[#888] mb-2">{t('peakPerformance.longestBinge')}</div>
                    <div className="font-['Bebas_Neue'] text-4xl text-[#f7931e]">
                      {formatHours(stats.longestBingeMinutes)}
                    </div>
                  </div>
                  <div className="font-['DM_Sans'] text-sm text-[#e8e8e8] md:text-right">
                    {stats.longestBingeShow && (
                      <>{t('peakPerformance.bingingShow', { show: stats.longestBingeShow })}</>
                    )}
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="p-8 rounded-lg bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-[#333]"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="font-['DM_Sans'] text-base text-[#888] mb-2">{t('peakPerformance.favoriteTime')}</div>
                    <div className="font-['Bebas_Neue'] text-4xl text-[#ff6b35]">
                      {formatTime(stats.mostActiveHour)}
                    </div>
                  </div>
                  <div className="font-['DM_Sans'] text-sm text-[#e8e8e8]">
                    {t('peakPerformance.peakWatchingHour')}
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* Slide 12: Fun Facts */}
        <section className="snap-start min-h-screen flex items-center justify-center px-6 py-20">
          <motion.div
            className="max-w-3xl w-full"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.3 }}
          >
            <motion.h2
              className="font-['Bebas_Neue'] text-5xl md:text-7xl text-[#e8e8e8] text-center mb-12"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              {t('funFacts.title')}
            </motion.h2>

            <div className="space-y-6">
              {(() => {
                const generatedFacts = [];

                // Add original fun facts
                if (stats.funFacts) {
                  generatedFacts.push(...stats.funFacts);
                }

                // Generate additional facts from data
                if (stats.mostActiveDayOfWeek) {
                  generatedFacts.push(t('funFacts.dayOfWeek', { day: stats.mostActiveDayOfWeek }));
                }

                if (stats.topShows[0] && stats.topShows[0].episodes > 20) {
                  generatedFacts.push(t('funFacts.crushedEpisodes', { count: stats.topShows[0].episodes, title: stats.topShows[0].title }));
                }

                if (stats.qualityStats && stats.qualityStats.directPlay > stats.qualityStats.transcode) {
                  const percentage = Math.round((stats.qualityStats.directPlay / stats.totalPlays) * 100);
                  generatedFacts.push(t('funFacts.originalQuality', { percentage }));
                }

                const moviesVsShows = stats.totalMovies > stats.totalTvEpisodes ? t('contentTypes.movies') : t('contentTypes.tvShows');
                generatedFacts.push(t('funFacts.preference', { type: moviesVsShows }));

                if (stats.daysActive < 200) {
                  const percentage = Math.round((stats.daysActive / 365) * 100);
                  generatedFacts.push(t('funFacts.watchedPercentage', { percentage }));
                }

                if (stats.topDevices[0]) {
                  generatedFacts.push(t('funFacts.favoriteDevice', { device: stats.topDevices[0].device }));
                }

                return generatedFacts.slice(0, 6).map((fact, index) => (
                  <motion.div
                    key={index}
                    className="p-6 rounded-lg bg-gradient-to-r from-[#1a1a1a] to-[#0a0a0a] border border-[#333] hover:border-[#ff6b35] transition-all"
                    initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.15 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#ff6b35] flex items-center justify-center font-['Bebas_Neue'] text-[#0a0a0a]">
                        {index + 1}
                      </div>
                      <div className="font-['DM_Sans'] text-sm text-[#e8e8e8] leading-relaxed">
                        {fact}
                      </div>
                    </div>
                  </motion.div>
                ));
              })()}
            </div>
          </motion.div>
        </section>

        {/* Final Slide: Thank You */}
        <section className="snap-start min-h-screen flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0">
            <motion.div
              className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#ff6b35_0%,transparent_70%)]"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.1, 0.2, 0.1]
              }}
              transition={{ duration: 5, repeat: Infinity }}
            />
          </div>

          <motion.div
            className="text-center z-10 px-6"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="font-['Bebas_Neue'] text-6xl md:text-8xl text-[#e8e8e8] mb-6">
                {t('thankYou.title')}
              </h2>
              <p className="font-['DM_Sans'] text-[#888] text-sm mb-12">
                {t('thankYou.subtitle')}
              </p>
            </motion.div>

            <motion.div
              className="flex flex-col items-center gap-4"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
            >
              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="https://plex.myhserver.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-8 py-3 bg-[#ff6b35] text-[#0a0a0a] font-['Bebas_Neue'] text-xl tracking-wider hover:bg-[#ff8555] transition-all hover:scale-105 rounded-lg text-center leading-[2rem]"
                >
                  {t('thankYou.watchMore')}
                </a>
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="px-8 py-3 bg-[#1a1a1a] text-[#e8e8e8] border-2 border-[#333] font-['Bebas_Neue'] text-xl tracking-wider hover:border-[#ff6b35] transition-all hover:scale-105 rounded-lg"
                >
                  {t('thankYou.scrollToTop')}
                </button>
              </div>

              <div className="font-['DM_Sans'] text-sm text-[#555] mt-4">
                {t('thankYou.generated', { year, date: new Date(data.generatedAt).toLocaleDateString() })}
              </div>
            </motion.div>
          </motion.div>
        </section>

      </div>
    </>
  );
}
