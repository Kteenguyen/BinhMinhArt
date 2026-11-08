import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Users, Search, X, ChevronDown, Check } from 'lucide-react';
import { matchArtistQuery } from '../utils/vietnameseSearch';

/**
 * Enterprise Smart Artist Dropdown (Combobox)
 * - Renders popup via React Portal (document.body) to completely prevent being
 *   clipped or trapped inside horizontal overflow containers (overflow-x: auto).
 * - Smart search with Vietnamese tone removal, acronym/initials matching (thm, dvs, dh, hht, etc.)
 * - Keyboard navigation (Arrow keys + Enter + Escape).
 * - Full Mobile-First Touch UX compliance.
 */
export default function SmartArtistDropdown({
  selectedArtist = 'all',
  onSelectArtist,
  artists = [], // Array of { name: string, count?: number } or string[]
  allCount = null,
  placeholder = 'Chọn hoặc tìm kiếm theo danh mục Họa sĩ',
  searchPlaceholder = 'Gõ tên, chữ cái đầu (VD: thm, dvs, sen)...',
  className = '',
  buttonClassName = '',
  dropdownWidth = 270,
  showAllOption = true,
  allOptionLabel = 'Tất cả họa sĩ',
  iconColor = 'text-[#7D1818]',
  theme = 'default' // 'default' | 'gold' | 'compact'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchKey, setSearchKey] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: dropdownWidth, openUpward: false });

  const triggerRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Normalize artists list to [{ name: string, count: number }]
  const normalizedArtists = useMemo(() => {
    return artists.map(item => {
      if (typeof item === 'string') {
        return { name: item, count: 0 };
      }
      return {
        name: item.name || '',
        count: typeof item.count === 'number' ? item.count : 0
      };
    }).filter(a => a.name.trim() !== '');
  }, [artists]);

  // Total count across all artists
  const computedAllCount = useMemo(() => {
    if (typeof allCount === 'number') return allCount;
    return normalizedArtists.reduce((sum, a) => sum + (a.count || 0), 0);
  }, [allCount, normalizedArtists]);

  // Current selected artist object
  const currentArtistObj = useMemo(() => {
    return normalizedArtists.find(a => a.name === selectedArtist);
  }, [normalizedArtists, selectedArtist]);

  // Smart filtered & ranked artists
  const filteredArtists = useMemo(() => {
    const q = (searchKey || '').trim();
    if (!q) {
      return normalizedArtists;
    }

    return normalizedArtists
      .map(artist => {
        const matchResult = matchArtistQuery(artist.name, q);
        return {
          ...artist,
          ...matchResult
        };
      })
      .filter(item => item.match)
      .sort((a, b) => {
        // Highest score first, then count descending, then alphabetical
        if (b.score !== a.score) return b.score - a.score;
        if (b.count !== a.count) return b.count - a.count;
        return a.name.localeCompare(b.name, 'vi');
      });
  }, [normalizedArtists, searchKey]);

  // Calculate position when opening or scrolling/resizing
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = 310; // estimate max height
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    const w = Math.min(
      Math.max(rect.width, dropdownWidth),
      window.innerWidth - 16
    );

    let left = rect.left;
    if (left + w > window.innerWidth - 8) {
      left = window.innerWidth - w - 8;
    }
    if (left < 8) left = 8;

    const top = openUpward
      ? Math.max(8, rect.top - dropdownHeight - 4)
      : rect.bottom + 4;

    setCoords({
      top,
      left,
      width: w,
      openUpward
    });
  };

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();
    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    const handleClickOutside = (event) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(event.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    // Auto focus search input
    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 40);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      clearTimeout(timer);
    };
  }, [isOpen]);

  const handleOpen = () => {
    setSearchKey('');
    setActiveIndex(-1);
    updatePosition();
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleSelect = (artistName) => {
    if (onSelectArtist) {
      onSelectArtist(artistName);
    }
    handleClose();
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    const totalItems = (showAllOption && !searchKey ? 1 : 0) + filteredArtists.length;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev + 1 < totalItems ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev - 1 >= 0 ? prev - 1 : totalItems - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex === 0 && showAllOption && !searchKey) {
        handleSelect('all');
      } else {
        const offset = showAllOption && !searchKey ? 1 : 0;
        const targetArtist = filteredArtists[activeIndex - offset];
        if (targetArtist) {
          handleSelect(targetArtist.name);
        } else if (filteredArtists.length > 0) {
          handleSelect(filteredArtists[0].name);
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
    }
  };

  // Label text formatting
  const buttonLabel = useMemo(() => {
    if (selectedArtist === 'all') {
      return `${allOptionLabel} (${computedAllCount})`;
    }
    return `HS. ${selectedArtist} (${currentArtistObj?.count || 0})`;
  }, [selectedArtist, allOptionLabel, computedAllCount, currentArtistObj]);

  return (
    <div className={`relative shrink-0 ${className}`}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (isOpen ? handleClose() : handleOpen())}
        title={placeholder}
        className={`h-[32px] px-2.5 text-[11px] sm:text-[11.5px] bg-[#FAF8F5] hover:bg-[#F5EFE6] border border-[#EAE5D9] rounded-md font-semibold text-stone-800 flex items-center justify-between gap-1.5 transition-all cursor-pointer whitespace-nowrap select-none ${
          isOpen ? 'ring-2 ring-[#C5A059] border-[#C5A059]' : ''
        } ${buttonClassName}`}
      >
        <span className="flex items-center gap-1.5 truncate">
          <Users className={`w-3.5 h-3.5 ${iconColor} shrink-0`} />
          <span className="truncate max-w-[130px] sm:max-w-[170px] md:max-w-[210px] text-left">
            {buttonLabel}
          </span>
        </span>
        <ChevronDown
          className={`w-3 h-3 text-stone-500 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu Portal (Mounted directly to document.body to prevent clipping) */}
      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 99999
            }}
            className="bg-white border border-[#DFCBAA] rounded-lg shadow-2xl overflow-hidden font-sans animate-in fade-in-50 zoom-in-98 duration-100 ring-1 ring-black/5"
            onKeyDown={handleKeyDown}
          >
            {/* Header Search Box */}
            <div className="p-2 border-b border-[#EAE5D9] bg-[#FAF8F5]">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchKey}
                  onChange={(e) => {
                    setSearchKey(e.target.value);
                    setActiveIndex(0);
                  }}
                  placeholder={searchPlaceholder}
                  className="w-full h-[32px] pl-8 pr-7 text-[11.5px] sm:text-[12px] bg-white border border-[#DDD5C4] rounded-md focus:outline-none focus:border-[#7D1818] focus:ring-1 focus:ring-[#7D1818] transition-colors"
                />
                {searchKey && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchKey('');
                      if (inputRef.current) inputRef.current.focus();
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-0.5"
                    title="Xóa từ khóa tìm kiếm"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Options List */}
            <div className="max-h-[240px] sm:max-h-[280px] overflow-y-auto p-1 divide-y divide-stone-50 text-[11.5px]">
              {/* Option "All Artists" (Visible if search is empty or query matches all) */}
              {showAllOption && !searchKey && (
                <button
                  type="button"
                  onClick={() => handleSelect('all')}
                  className={`w-full px-2.5 py-1.5 text-left rounded-md flex items-center justify-between font-semibold transition-colors cursor-pointer ${
                    selectedArtist === 'all'
                      ? 'bg-[#7D1818] text-white'
                      : activeIndex === 0
                      ? 'bg-[#F5EFE6] text-stone-900'
                      : 'text-stone-700 hover:bg-[#FAF8F5]'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {selectedArtist === 'all' && <Check className="w-3.5 h-3.5 shrink-0" />}
                    <span>{allOptionLabel}</span>
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      selectedArtist === 'all'
                        ? 'bg-white/20 text-white'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {computedAllCount}
                  </span>
                </button>
              )}

              {/* Filtered Artists List */}
              {filteredArtists.length === 0 ? (
                <div className="py-5 text-center space-y-1">
                  <p className="text-stone-500 text-[11.5px]">
                    Không tìm thấy họa sĩ nào khớp với <strong>"{searchKey}"</strong>
                  </p>
                  <p className="text-[10.5px] text-stone-600">
                    Hãy thử gõ chữ cái đầu hoặc họ tên (không dấu)
                  </p>
                </div>
              ) : (
                filteredArtists.map((artist, idx) => {
                  const isSelected = selectedArtist === artist.name;
                  const itemIndex = (showAllOption && !searchKey ? 1 : 0) + idx;
                  const isHighlighted = activeIndex === itemIndex;

                  return (
                    <button
                      key={artist.name}
                      type="button"
                      onClick={() => handleSelect(artist.name)}
                      onMouseEnter={() => setActiveIndex(itemIndex)}
                      className={`w-full px-2.5 py-1.5 text-left rounded-md flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#7D1818] text-white font-bold'
                          : isHighlighted
                          ? 'bg-[#F4E5B8]/50 text-stone-900'
                          : 'text-stone-800 hover:bg-[#FAF8F5]'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                        <span className="truncate">
                          HS. {artist.name}
                        </span>
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono shrink-0 ml-2 ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {artist.count}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
