import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

export interface MenuOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  iconClass?: string;
  labelClass?: string;
  onClick: () => void;
}

interface AdaptiveMessageMenuProps {
  isOpen: boolean;
  onClose: () => void;
  options: MenuOption[];
  bubbleRef: React.RefObject<HTMLDivElement>;
  isOwnMessage: boolean;
}

const VIEWPORT_MARGIN = 12;
const MENU_SIDE_OFFSET = 10;
const MENU_VERTICAL_WIDTH = 150; // Passé de 110 à 150 pour accueillir confortablement les mots comme "Transférer" ou "Supprimer"
const MENU_VERTICAL_PADDING = 8;
const MENU_VERTICAL_GAP = 4;
const MENU_VERTICAL_ACTION_HEIGHT = 56;
const MENU_HORIZONTAL_HEIGHT = 84;
const MENU_HORIZONTAL_ITEM_WIDTH = 68;
const MENU_HORIZONTAL_PADDING_X = 12;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const renderMenuIcon = (icon: React.ReactNode, id: string, customClass?: string) => {
  if (!React.isValidElement(icon)) {
    return icon;
  }

  const element = icon as React.ReactElement<{ className?: string; size?: number }>;
  const existingClassName = element.props.className ?? '';

  // Couleurs modernes par action
  const colorMap: Record<string, { bg: string, text: string }> = {
    reply: { bg: 'bg-blue-50', text: 'text-blue-600' },
    forward: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
    react: { bg: 'bg-amber-50', text: 'text-amber-600' },
    edit: { bg: 'bg-slate-50', text: 'text-slate-600' },
    delete: { bg: 'bg-red-50', text: 'text-red-600' },
    copy: { bg: 'bg-violet-50', text: 'text-violet-600' },
  };

  const colors = colorMap[id] || { bg: 'bg-gray-50', text: 'text-gray-600' };

  return (
    <div className={`flex items-center justify-center w-9 h-9 rounded-full transition-transform ${colors.bg}`}>
      {React.cloneElement(element, {
        size: 18,
        className: `${existingClassName} ${customClass || colors.text} drop-shadow-sm`.trim(),
      })}
    </div>
  );
};

export const AdaptiveMessageMenu: React.FC<AdaptiveMessageMenuProps> = ({
  isOpen,
  onClose,
  options,
  bubbleRef,
  isOwnMessage,
}) => {
  const [layout, setLayout] = useState<'vertical' | 'horizontal'>('horizontal');
  const [rect, setRect] = useState<DOMRect | null>(null);
  const displayedOptions = options;

  useEffect(() => {
    if (isOpen && bubbleRef.current) {
      const bubbleRect = bubbleRef.current.getBoundingClientRect();
      setRect(bubbleRect);

      const verticalMenuHeight = (MENU_VERTICAL_PADDING * 2)
        + (options.length * MENU_VERTICAL_ACTION_HEIGHT)
        + (Math.max(options.length - 1, 0) * MENU_VERTICAL_GAP);

      const availableSideSpace = isOwnMessage
        ? bubbleRect.left - VIEWPORT_MARGIN
        : window.innerWidth - bubbleRect.right - VIEWPORT_MARGIN;

      setLayout(
        bubbleRect.height >= (verticalMenuHeight - 20) && availableSideSpace >= (MENU_VERTICAL_WIDTH)
          ? 'vertical'
          : 'horizontal'
      );
    } else if (!isOpen) {
      setRect(null);
    }
  }, [isOpen, bubbleRef, isOwnMessage, options.length]);

  useEffect(() => {
    if (!isOpen) return;

    // Fermer les autres menus ouverts
    const event = new CustomEvent('close-adaptive-menus', { detail: { currentRef: bubbleRef } });
    window.dispatchEvent(event);

    const handleCloseEvent = (e: any) => {
      if (e.detail.currentRef !== bubbleRef) {
        onClose();
      }
    };

    const handleOutsideClick = () => onClose();
    const handleContextClickOutside = () => onClose();
    const handleScroll = () => onClose();

    window.addEventListener('close-adaptive-menus', handleCloseEvent);

    const timer = setTimeout(() => {
      window.addEventListener('click', handleOutsideClick);
      window.addEventListener('touchstart', handleOutsideClick);
      window.addEventListener('contextmenu', handleContextClickOutside);
      // Ferme le menu dès qu'il y a un défilement dans n'importe quel conteneur (capture: true)
      window.addEventListener('scroll', handleScroll, true); 
    }, 50);

    return () => {
      window.removeEventListener('close-adaptive-menus', handleCloseEvent);
      clearTimeout(timer);
      window.removeEventListener('click', handleOutsideClick);
      window.removeEventListener('touchstart', handleOutsideClick);
      window.removeEventListener('contextmenu', handleContextClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, onClose, bubbleRef]);

  if (!isOpen || !rect) return null;

  let top = 0;
  let left = 0;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const verticalMenuHeight = (MENU_VERTICAL_PADDING * 2)
    + (options.length * MENU_VERTICAL_ACTION_HEIGHT)
    + (Math.max(options.length - 1, 0) * MENU_VERTICAL_GAP);
  const horizontalMenuWidth = Math.min(
    viewportWidth - (VIEWPORT_MARGIN * 2),
    Math.max(rect.width, (options.length * MENU_HORIZONTAL_ITEM_WIDTH) + (MENU_HORIZONTAL_PADDING_X * 2))
  );

  if (layout === 'vertical') {
    top = clamp(
      rect.top + (rect.height / 2) - (verticalMenuHeight / 2),
      VIEWPORT_MARGIN,
      viewportHeight - verticalMenuHeight - VIEWPORT_MARGIN
    );

    if (isOwnMessage) {
      left = clamp(
        rect.left - MENU_VERTICAL_WIDTH - MENU_SIDE_OFFSET,
        VIEWPORT_MARGIN,
        viewportWidth - MENU_VERTICAL_WIDTH - VIEWPORT_MARGIN
      );
    } else {
      left = clamp(
        rect.right + MENU_SIDE_OFFSET,
        VIEWPORT_MARGIN,
        viewportWidth - MENU_VERTICAL_WIDTH - VIEWPORT_MARGIN
      );
    }
  } else {
    top = rect.bottom + MENU_SIDE_OFFSET;
    if (top + MENU_HORIZONTAL_HEIGHT > viewportHeight - VIEWPORT_MARGIN) {
      top = rect.top - MENU_HORIZONTAL_HEIGHT - MENU_SIDE_OFFSET;
    }

    left = clamp(
      rect.left + (rect.width / 2) - (horizontalMenuWidth / 2),
      VIEWPORT_MARGIN,
      viewportWidth - horizontalMenuWidth - VIEWPORT_MARGIN
    );
  }

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top,
    left,
    zIndex: 99999,
    width: layout === 'vertical' ? MENU_VERTICAL_WIDTH : horizontalMenuWidth,
  };

  return createPortal(
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: layout === 'horizontal' ? -10 : 0, filter: 'blur(10px)' }}
          animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          style={overlayStyle}
          className={`${
            layout === 'vertical' 
            ? 'rounded-[24px] p-2' 
            : 'rounded-[26px] px-3 py-2.5'
          } bg-white/90 backdrop-blur-2xl border border-white/60 shadow-[0_20px_50px_rgba(0,0,0,0.12)] border-t-white/80`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={layout === 'vertical' ? 'flex flex-col gap-1' : 'flex flex-row items-center justify-between gap-1'}>
            {displayedOptions.map((option) => (
              <motion.button
                key={option.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { option.onClick(); onClose(); }}
                className={`flex ${layout === 'vertical' ? 'w-full flex-row items-center justify-start gap-3 px-2 py-2' : 'flex-1 flex-col items-center justify-center gap-1.5 py-2'} rounded-[18px] transition-all hover:bg-slate-50`}
              >
                <div className="shrink-0">
                  {renderMenuIcon(option.icon, option.id, option.iconClass)}
                </div>
                <span className={`text-[12px] font-semibold tracking-tight text-slate-700 truncate ${layout === 'vertical' ? 'w-full text-left' : ''} ${option.labelClass || ''}`}>
                  {option.label}
                </span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};


