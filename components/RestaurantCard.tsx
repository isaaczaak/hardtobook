"use client";

import { useState } from "react";
import { Restaurant } from "@/lib/types";

const difficultyColors: Record<number, string> = {
  5: "bg-red-600",
  4: "bg-orange-600",
  3: "bg-yellow-600",
  2: "bg-green-600",
  1: "bg-blue-600",
};

const platformColors: Record<string, string> = {
  Resy: "bg-blue-700",
  Tock: "bg-purple-700",
  OpenTable: "bg-red-700",
  Phone: "bg-yellow-600 text-black",
  "Invitation Only": "bg-zinc-700",
};

function LinkIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M12.232 4.232a2.5 2.5 0 0 1 3.536 3.536l-1.225 1.224a.75.75 0 0 0 1.061 1.06l1.224-1.224a4 4 0 0 0-5.656-5.656l-3 3a4 4 0 0 0 .225 5.865.75.75 0 0 0 .977-1.138 2.5 2.5 0 0 1-.142-3.667l3-3Z" />
      <path d="M11.603 7.963a.75.75 0 0 0-.977 1.138 2.5 2.5 0 0 1 .142 3.667l-3 3a2.5 2.5 0 0 1-3.536-3.536l1.225-1.224a.75.75 0 0 0-1.061-1.06l-1.224 1.224a4 4 0 1 0 5.656 5.656l3-3a4 4 0 0 0-.225-5.865Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

export function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-zinc-900 p-3 border border-zinc-700">
      <div className="flex justify-between items-start mb-1">
        <h3 className="text-sm font-semibold text-white leading-tight">{restaurant.name}</h3>
        <span className={`px-1.5 py-0.5 text-[10px] font-bold ${difficultyColors[restaurant.difficulty]}`}>
          {restaurant.difficulty}/5
        </span>
      </div>

      <p className="text-zinc-500 text-xs mb-2">
        {restaurant.neighborhood} · {restaurant.cuisine}
      </p>

      <div className="flex flex-wrap gap-1 mb-2">
        <span className={`px-1.5 py-0.5 text-[10px] font-medium ${platformColors[restaurant.platform]}`}>
          {restaurant.platform}
        </span>
        {restaurant.walkIns && (
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-800">Walk-ins</span>
        )}
      </div>

      <div className="space-y-0.5 text-xs mb-2 border-t border-zinc-800 pt-2">
        <div className="flex justify-between">
          <span className="text-zinc-500">Window</span>
          <span className="text-zinc-300">{restaurant.bookingWindow}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Release</span>
          <span className="text-orange-400 font-medium">{restaurant.releaseTime}</span>
        </div>
      </div>

      <div className="flex gap-2 mb-2">
        {restaurant.website && (
          <a
            href={restaurant.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 hover:text-white"
            title="Website"
          >
            <LinkIcon />
          </a>
        )}
        {restaurant.instagram && (
          <a
            href={`https://instagram.com/${restaurant.instagram}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 hover:text-white"
            title="Instagram"
          >
            <InstagramIcon />
          </a>
        )}
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-[10px] text-zinc-500 hover:text-white uppercase tracking-wide"
      >
        {expanded ? "- Hide" : "+ Guide"}
      </button>

      {expanded && (
        <div className="mt-2 pt-2 border-t border-zinc-800 space-y-2">
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Signature</p>
            <p className="text-xs text-zinc-300">{restaurant.signatureDish}</p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Guide</p>
            <ul className="text-xs text-zinc-400 space-y-0.5">
              {restaurant.tips.map((tip, i) => (
                <li key={i}>· {tip}</li>
              ))}
            </ul>
          </div>
          {restaurant.walkInTips && (
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Walk-in</p>
              <p className="text-xs text-zinc-400">{restaurant.walkInTips}</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-2 space-y-1">
        {restaurant.platformUrl && (
          <a
            href={restaurant.platformUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center bg-white hover:bg-zinc-200 text-black py-1.5 text-xs font-medium"
          >
            Book on {restaurant.platform}
          </a>
        )}
        {restaurant.phoneNumber && (
          <a
            href={`tel:${restaurant.phoneNumber}`}
            className="block w-full text-center bg-zinc-700 hover:bg-zinc-600 text-white py-1.5 text-xs font-medium"
          >
            {restaurant.phoneNumber}
          </a>
        )}
      </div>
    </div>
  );
}
