import { Button } from '@/components/ui/button';
import { Radio } from 'lucide-react';
import React from 'react';

interface LiveRailButtonProps {
    isOpen: boolean;
    liveCount: number;
    onToggle: () => void;
}

const LiveRailButton: React.FC<LiveRailButtonProps> = ({ isOpen, liveCount, onToggle }) => {
    const isLive = liveCount > 0;
    const buttonStyle = isLive ? 'bg-red-500' : 'bg-transparent';
    const ariaLabel = isOpen ? 'Live feed is open' : 'Live feed is closed';

    return (
        <Button className={buttonStyle} onClick={onToggle} aria-label={ariaLabel}>
            {isLive && <span className="badge">{liveCount}</span>}
            {isLive ? <Radio /> : 'Live'}
        </Button>
    );
};

export default LiveRailButton;