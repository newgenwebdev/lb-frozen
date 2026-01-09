"use client";

import { HeroContent } from "@/lib/api/medusa";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import { Autoplay, EffectCoverflow, EffectFade } from "swiper/modules";

export function TopBanner({
  contents,
}: {
  contents: HeroContent[];
}): React.JSX.Element {
  if (contents.length === 0) return <></>;

  return (
    <div className="fixed z-50 left-0 top-0 bottom-6 w-full h-6">
      <Swiper
        wrapperClass="h-6!"
        slidesPerView={1}
        spaceBetween={0}
        direction="vertical"
        modules={[Autoplay]}
        loop={true}
        speed={1000}
        autoplay={{
          delay: 3000,
          disableOnInteraction: false,
        }}
      >
        {contents.map((content) => (
          <SwiperSlide key={content.id} className="h-6!">
            <div
              className="w-full h-6"
              style={{
                backgroundColor: content.backgroundColor,
                color: content.textColor,
              }}
            >
              <div className="container mx-auto flex justify-center items-center h-full">
                <Link href={content.buttonUrl} className="text-xs text-center">
                  {content.heading}
                </Link>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
