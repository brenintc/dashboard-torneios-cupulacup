'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Torneio {
  id: number;
  title: string;
  game: string;
  status: string;
}

export default function Home() {
  const [torneios, setTorneios] = useState([]);
  const [loading, setLoading] = useState(true);

  const carregarTorneios = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('id, title, game, status')
        .order('id', { ascending: false });

      if (!error && data) {
        setTorneios(data);
      }
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarTorneios();
  }, []);

  return (