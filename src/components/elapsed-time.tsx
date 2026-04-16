"use client";

import { useState, useEffect } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function ElapsedTime({ startTime }: { startTime: Date }) {
    const [elapsed, setElapsed] = useState('');

    useEffect(() => {
        const updateElapsedTime = () => {
            setElapsed(formatDistanceToNowStrict(startTime, { addSuffix: false, locale: ptBR }));
        };
        
        updateElapsedTime();
        const timer = setInterval(updateElapsedTime, 1000 * 60); // Update every minute

        return () => clearInterval(timer);
    }, [startTime]);

    return <span>{elapsed}</span>;
}
