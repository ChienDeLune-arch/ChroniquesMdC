'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, BarChart, Bar,
} from 'recharts'

interface ChartData { day: string; users: number; posts: number }

export function AdminCharts({ data }: { data: ChartData[] }) {
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Nouveaux membres */}
      <div className="surface-card p-5">
        <h3 className="font-medium text-primary mb-4">Nouveaux membres — 30 jours</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-border))" />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'rgb(var(--color-muted))' }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'rgb(var(--color-muted))' }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: 'rgb(var(--color-surface-1))',
                border: '1px solid rgb(var(--color-border))',
                borderRadius: '10px', fontSize: 12,
              }}
            />
            <Line type="monotone" dataKey="users" name="Membres" stroke="#6B5FE4" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Articles publiés */}
      <div className="surface-card p-5">
        <h3 className="font-medium text-primary mb-4">Articles publiés — 30 jours</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-border))" />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'rgb(var(--color-muted))' }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'rgb(var(--color-muted))' }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: 'rgb(var(--color-surface-1))',
                border: '1px solid rgb(var(--color-border))',
                borderRadius: '10px', fontSize: 12,
              }}
            />
            <Bar dataKey="posts" name="Articles" fill="#6B5FE4" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
