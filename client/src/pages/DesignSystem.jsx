import React from 'react';
import {
  Card, Btn, Input, Lbl, Avatar, StatusBadge, EmptyState,
  NotifBell, RolePill, SectionTitle, SparkArea, SparkBar,
  Icon, IC,
  M, VISIT_STATUS, EXPENSE_STATUS, ROLE_META, CHART_DATA,
} from '../design';

const Section = ({ title, children }) => (
  <section className="mb-10">
    <SectionTitle>{title}</SectionTitle>
    <Card>
      <div className="p-6">{children}</div>
    </Card>
  </section>
);

const Swatch = ({ name, hex }) => (
  <div className="flex flex-col gap-1">
    <div
      className="h-16 rounded-md border border-meridian-border"
      style={{ background: hex }}
      aria-label={`${name} swatch`}
    />
    <div className="text-[11px] font-bold text-meridian-text">{name}</div>
    <div className="text-[10px] text-meridian-muted font-mono">{hex}</div>
  </div>
);

export default function DesignSystem() {
  return (
    <div className="min-h-screen bg-meridian-bg p-8 font-sans">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold font-display text-meridian-text">
            Meridian Design System
          </h1>
          <p className="text-meridian-sub text-sm mt-2">
            Dev-only primitive gallery. Not shipped to production.
          </p>
          <div className="mt-3 inline-flex items-center gap-2 bg-meridian-navy text-white text-xs font-semibold px-3 py-1 rounded-full">
            <Icon path={IC.info} size={12} color="white" />
            DEV MODE ONLY — import.meta.env.DEV
          </div>
        </div>

        {/* 1. Foundations — Colors */}
        <Section title="Foundations — Colors">
          <div className="grid grid-cols-7 gap-4">
            {Object.entries(M).filter(([k]) => k !== 'cardShadow').map(([k, v]) => (
              <Swatch key={k} name={k} hex={v} />
            ))}
          </div>
        </Section>

        {/* 2. Foundations — Typography */}
        <Section title="Foundations — Typography">
          <div className="space-y-3">
            <p className="font-display text-2xl font-extrabold text-meridian-text">
              Manrope (font-display) — used for headings and KPIs
            </p>
            <p className="font-sans text-base text-meridian-text">
              Inter (font-sans) — used for body text, inputs, labels.
            </p>
            <div className="mt-2">
              <Lbl>Sample Lbl Component</Lbl>
            </div>
            <div className="mt-2">
              <SectionTitle>Sample SectionTitle Component</SectionTitle>
            </div>
          </div>
        </Section>

        {/* 3. Layout */}
        <Section title="Layout">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <div className="p-4">
                <p className="text-meridian-text text-sm">Card with simple content.</p>
                <p className="text-meridian-sub text-xs mt-1">bg-white rounded-lg shadow-meridian-card</p>
              </div>
            </Card>
            <EmptyState icon={IC.search} title="No results found" sub="Try a different filter." />
          </div>
        </Section>

        {/* 4. Buttons */}
        <Section title="Buttons">
          <div className="space-y-3">
            {['primary','secondary','danger','ghost','blue'].map(v => (
              <div key={v} className="flex gap-2 items-center">
                <span className="text-[11px] text-meridian-muted w-20 uppercase">{v}</span>
                <Btn variant={v} size="sm">Small</Btn>
                <Btn variant={v} size="md">Medium</Btn>
                <Btn variant={v} size="lg">Large</Btn>
              </div>
            ))}
            <div className="pt-2 border-t border-meridian-border flex gap-2">
              <Btn icon={<Icon path={IC.plus} size={14} color="white" />}>New Visit</Btn>
              <Btn variant="secondary" icon={<Icon path={IC.download} size={14} />}>Export</Btn>
            </div>
          </div>
        </Section>

        {/* 5. Inputs */}
        <Section title="Inputs">
          <div className="grid grid-cols-2 gap-4">
            <Input placeholder="Plain input" />
            <Input placeholder="Search…" icon={<Icon path={IC.search} size={14} />} />
          </div>
        </Section>

        {/* 6. Status Badges */}
        <Section title="Status Badges">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[11px] text-meridian-muted uppercase mr-2">Visit:</span>
              {Object.keys(VISIT_STATUS).map(k => <StatusBadge key={k} status={k} />)}
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[11px] text-meridian-muted uppercase mr-2">Expense:</span>
              {Object.keys(EXPENSE_STATUS).map(k => (
                <StatusBadge key={k} status={k} map={EXPENSE_STATUS} />
              ))}
            </div>
          </div>
        </Section>

        {/* 7. Role Pills */}
        <Section title="Role Pills">
          <div className="flex flex-wrap gap-2">
            {Object.keys(ROLE_META).map(role => <RolePill key={role} role={role} />)}
            <RolePill role="unknown_role" />
          </div>
        </Section>

        {/* 8. Avatars */}
        <Section title="Avatars">
          <div className="flex gap-6 items-center flex-wrap">
            <div className="flex flex-col items-center gap-1">
              <Avatar name="Priya Sharma" size={32} />
              <code className="text-[10px] text-meridian-sub">name="Priya Sharma" → PR</code>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Avatar name="Rajan" size={48} color={M.blue} />
              <code className="text-[10px] text-meridian-sub">name="Rajan" size=48 → RA</code>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Avatar name="" size={40} color={M.gold} />
              <code className="text-[10px] text-meridian-sub">name="" → ?</code>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Avatar name="K" size={32} />
              <code className="text-[10px] text-meridian-sub">name="K" → KA? no → K</code>
            </div>
          </div>
          <p className="text-[11px] text-meridian-muted mt-4">
            Initials logic: empty → "?", single word → first 2 chars, multi-word → first letter of first 2 words.
          </p>
        </Section>

        {/* 9. Notification Bell */}
        <Section title="Notification Bell">
          <div className="flex gap-6 items-center">
            <div className="flex flex-col items-center gap-2">
              <NotifBell count={0} />
              <code className="text-[10px] text-meridian-sub">count=0 (no badge)</code>
            </div>
            <div className="flex flex-col items-center gap-2">
              <NotifBell count={3} />
              <code className="text-[10px] text-meridian-sub">count=3</code>
            </div>
            <div className="flex flex-col items-center gap-2">
              <NotifBell count={12} />
              <code className="text-[10px] text-meridian-sub">count=12</code>
            </div>
          </div>
        </Section>

        {/* 10. Charts */}
        <Section title="Charts">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <div className="p-4">
                <Lbl>SparkArea</Lbl>
                <SparkArea data={CHART_DATA} color={M.blue} uid="demo-area" />
              </div>
            </Card>
            <Card>
              <div className="p-4">
                <Lbl>SparkBar</Lbl>
                <SparkBar data={CHART_DATA} color={M.gold} uid="demo-bar" />
              </div>
            </Card>
          </div>
        </Section>

        {/* 11. Icon Catalog */}
        <Section title={`Icon Catalog (${Object.keys(IC).length} icons)`}>
          <div className="grid grid-cols-6 gap-3">
            {Object.entries(IC).map(([key, path]) => (
              <div
                key={key}
                className="flex flex-col items-center gap-2 p-3 border border-meridian-border rounded-md text-meridian-text hover:bg-meridian-row-hov transition-colors"
              >
                <Icon path={path} size={24} />
                <code className="text-[10px] text-meridian-sub text-center break-all">{key}</code>
              </div>
            ))}
          </div>
        </Section>

      </div>
    </div>
  );
}
