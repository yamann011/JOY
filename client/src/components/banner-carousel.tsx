import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import type { Banner } from "@shared/schema";

export function BannerCarousel() {
  const { data: banners, isLoading } = useQuery<Banner[]>({
    queryKey: ["/api/banners"],
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const goToNext = useCallback(() => {
    if (!banners || banners.length <= 1) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  }, [banners]);

  const goToPrev = useCallback(() => {
    if (!banners || banners.length <= 1) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  }, [banners]);

  useEffect(() => {
    if (!banners || banners.length <= 1) return;
    const interval = setInterval(goToNext, 4000);
    return () => clearInterval(interval);
  }, [banners, goToNext]);

  useEffect(() => {
    if (isTransitioning) {
      const timer = setTimeout(() => setIsTransitioning(false), 600);
      return () => clearTimeout(timer);
    }
  }, [isTransitioning]);

  if (isLoading) {
    return (
      <div className="w-full aspect-[740/106] bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 animate-pulse" />
    );
  }

  if (!banners || banners.length === 0) {
    return null;
  }

  return (
    <div className="w-full aspect-[740/106]" data-testid="banner-carousel">
      <div 
        ref={containerRef}
        className="relative w-full h-full overflow-hidden"
      >
        <div 
          className="flex h-full transition-transform duration-600 ease-out"
          style={{ 
            transform: `translateX(-${currentIndex * 100}%)`,
            transitionDuration: '600ms',
            transitionTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
          }}
        >
          {banners.map((banner) => (
            <div
              key={banner.id}
              className="flex-shrink-0 w-full h-full relative"
              style={{ minWidth: '100%' }}
            >
              {banner.imageUrl ? (
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${banner.imageUrl})` }}
                />
              ) : null}
              
              <div className="relative h-full flex items-center gap-2 sm:gap-4 px-2 sm:px-4 py-1 sm:py-2">
                <div className="flex-1 min-w-0">
                  {banner.title && (
                    <h2 className="text-sm sm:text-lg md:text-xl font-bold text-white drop-shadow-lg truncate">
                      {banner.title}
                    </h2>
                  )}
                  {banner.description && (
                    <p className="text-white/80 text-[10px] sm:text-xs md:text-sm max-w-md truncate">
                      {banner.description}
                    </p>
                  )}
                </div>
                {banner.ctaLabel && banner.ctaUrl && (
                  <Button
                    size="sm"
                    className="gold-gradient text-black font-semibold hover:opacity-90 shadow-lg flex-shrink-0 text-xs sm:text-sm px-2 sm:px-3 h-7 sm:h-8"
                    onClick={() => window.open(banner.ctaUrl!, "_blank")}
                    data-testid="banner-cta-button"
                  >
                    {banner.ctaLabel}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {banners.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 rounded-full w-5 h-5 sm:w-6 sm:h-6 border border-white/10"
              onClick={goToPrev}
              data-testid="banner-prev"
            >
              <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 rounded-full w-5 h-5 sm:w-6 sm:h-6 border border-white/10"
              onClick={goToNext}
              data-testid="banner-next"
            >
              <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </Button>

            <div className="absolute bottom-1 sm:bottom-2 left-1/2 -translate-x-1/2 flex gap-0.5 sm:gap-1">
              {banners.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setIsTransitioning(true);
                    setCurrentIndex(index);
                  }}
                  className={`h-0.5 sm:h-1 rounded-full transition-all duration-300 ${
                    index === currentIndex
                      ? "bg-primary w-3 sm:w-4"
                      : "bg-white/40 w-0.5 sm:w-1 hover:bg-white/60"
                  }`}
                  data-testid={`banner-dot-${index}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
