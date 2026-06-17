import { useState } from 'react'
import { Receipt, Flame, Search, Phone, ChefHat } from 'lucide-react'
import {
  Alert,
  BottomSheet,
  Button,
  Card,
  Checkbox,
  DataTable,
  EmptyState,
  FoodImage,
  Input,
  KeyHint,
  Keypad,
  Modal,
  SideDrawer,
  MoneyText,
  QtyStepper,
  RadioGroup,
  Select,
  Skeleton,
  StatusBadge,
  Tabs,
  Tooltip,
  useToast,
} from '../../components/ui'
import SkeletonGrid from '../../components/SkeletonGrid'

// Admin-only gallery of every UI primitive at /admin/_components. Used during
// the Phase 1 design-system pass to catch regressions visually and as a
// reference when implementing new screens. Not linked from the main nav.

function Section({ title, hint, children }) {
  return (
    <section className="space-y-4 border-b border-surface-line pb-10 last:border-0">
      <header>
        <h2 className="font-display text-xl font-bold tracking-tight text-ink-900">{title}</h2>
        {hint && <p className="mt-1 text-sm text-ink-600">{hint}</p>}
      </header>
      <div className="space-y-6">{children}</div>
    </section>
  )
}

function Row({ label, children }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-center gap-4">
      <div className="text-xs font-medium uppercase tracking-wider text-ink-500">{label}</div>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  )
}

export default function DesignSystemGallery() {
  const [qty, setQty] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [fullModalOpen, setFullModalOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerTab, setDrawerTab] = useState('basics')
  const [tab, setTab] = useState('orders')
  const [pillTab, setPillTab] = useState('all')
  const [underlineTab, setUnderlineTab] = useState('basics')
  const [verticalTab, setVerticalTab] = useState('mains')
  const [selectValue, setSelectValue] = useState('pending')
  const [check1, setCheck1] = useState(true)
  const [check2, setCheck2] = useState(false)
  const [radio, setRadio] = useState('upi')
  const [keypad, setKeypad] = useState('')
  const { push } = useToast()

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-8 py-10">
      <header className="border-b border-surface-line pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">DineFlow design system</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-ink-900">Components</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-600">
          Every primitive and shared component used across the kiosk, mobile and POS surfaces.
          Use this page to review variants and verify token consistency before shipping new screens.
        </p>
      </header>

      <Section title="Buttons" hint="Primary, hero, secondary, subtle, ghost, outline, danger, inverse.">
        <Row label="Sizes">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button size="xl">Kiosk</Button>
        </Row>
        <Row label="Variants">
          <Button variant="primary">Primary</Button>
          <Button variant="hero">Order now</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="subtle">Subtle</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="danger">Danger</Button>
        </Row>
        <Row label="With icons">
          <Button variant="primary" iconLeft={<Receipt className="h-4 w-4" />}>Place order</Button>
          <Button variant="outline" iconRight={<Search className="h-4 w-4" />}>Search</Button>
          <Button variant="hero" iconLeft={<Flame className="h-5 w-5" />} size="lg">Featured</Button>
        </Row>
        <Row label="States">
          <Button busy>Busy</Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
        </Row>
      </Section>

      <Section title="Status badges" hint="Both solid pill and dot variant — driven by `status.*` tokens.">
        <Row label="Solid">
          <StatusBadge status="pending" />
          <StatusBadge status="accepted" />
          <StatusBadge status="preparing" pulse />
          <StatusBadge status="ready" pulse />
          <StatusBadge status="completed" />
          <StatusBadge status="cancelled" />
          <StatusBadge status="paid" />
          <StatusBadge status="unpaid" />
        </Row>
        <Row label="Dot">
          <StatusBadge variant="dot" status="pending" />
          <StatusBadge variant="dot" status="preparing" pulse />
          <StatusBadge variant="dot" status="ready" />
          <StatusBadge variant="dot" status="cancelled" />
        </Row>
        <Row label="Sizes">
          <StatusBadge status="ready" size="sm" />
          <StatusBadge status="ready" size="md" />
          <StatusBadge status="ready" size="lg" />
        </Row>
      </Section>

      <Section title="Form controls">
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Email" placeholder="you@restaurant.com" />
          <Input label="Search" placeholder="Find an item" prefix={<Search className="h-4 w-4" />} />
          <Input label="Price" prefix={<span className="font-semibold">₹</span>} suffix={<span className="text-xs">INR</span>} placeholder="0.00" />
          <Input label="Phone" prefix={<Phone className="h-4 w-4" />} required hint="We'll text you when ready." />
          <Input label="Error state" error="That number isn't 10 digits." defaultValue="555" />
          <Input label="Kiosk size" size="kiosk" placeholder="Tap to type" />
          <Select
            label="Order status"
            value={selectValue}
            onChange={(e) => setSelectValue(e.target.value)}
            options={[
              { value: 'pending',   label: 'Pending' },
              { value: 'preparing', label: 'Preparing' },
              { value: 'ready',     label: 'Ready' },
              { value: 'completed', label: 'Completed' },
            ]}
          />
          <div className="flex flex-col gap-3 rounded-2xl bg-surface-0 p-4 ring-1 ring-inset ring-surface-line">
            <Checkbox label="Send WhatsApp on ready"  hint="Uses your Twilio account."  checked={check1} onChange={setCheck1} />
            <Checkbox label="Auto-print invoice"      hint="Print Agent must be running." checked={check2} onChange={setCheck2} />
            <Checkbox label="Mixed selection"         indeterminate checked={false} onChange={() => {}} />
          </div>
        </div>
        <Row label="Radio group">
          <RadioGroup
            name="payment"
            value={radio}
            onChange={setRadio}
            options={[
              { value: 'upi',  label: 'UPI / Razorpay', hint: 'GPay, PhonePe, Paytm', right: 'Instant' },
              { value: 'cash', label: 'Cash at counter', hint: 'Staff confirms at desk' },
              { value: 'card', label: 'Card terminal',   hint: 'Coming soon', disabled: true },
            ]}
          />
        </Row>
        <Row label="Quantity stepper">
          <QtyStepper size="sm" count={qty} onMinus={() => setQty((q) => Math.max(0, q - 1))} onPlus={() => setQty((q) => q + 1)} />
          <QtyStepper size="md" count={qty} onMinus={() => setQty((q) => Math.max(0, q - 1))} onPlus={() => setQty((q) => q + 1)} />
          <QtyStepper size="lg" count={qty} onMinus={() => setQty((q) => Math.max(0, q - 1))} onPlus={() => setQty((q) => q + 1)} />
          <QtyStepper size="kiosk" count={qty} max={9} onMinus={() => setQty((q) => Math.max(0, q - 1))} onPlus={() => setQty((q) => q + 1)} trashAtMin />
        </Row>
      </Section>

      <Section title="Tabs" hint="Segmented, underline, pill and vertical variants.">
        <Row label="Segmented">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { value: 'orders', label: 'Orders', count: 12 },
              { value: 'tables', label: 'Tables', count: 4 },
              { value: 'kitchen', label: 'Kitchen', count: 3 },
              { value: 'reports', label: 'Reports' },
            ]}
          />
        </Row>
        <Row label="Underline">
          <Tabs
            variant="underline"
            value={underlineTab}
            onChange={setUnderlineTab}
            items={[
              { value: 'basics',   label: 'Basics' },
              { value: 'variants', label: 'Variants', count: 3 },
              { value: 'ingredients', label: 'Ingredients' },
              { value: 'photo',    label: 'Photo' },
            ]}
          />
        </Row>
        <Row label="Pill">
          <Tabs
            variant="pill"
            value={pillTab}
            onChange={setPillTab}
            items={[
              { value: 'all',     label: 'All',     count: 24 },
              { value: 'starters',label: 'Starters' },
              { value: 'mains',   label: 'Mains' },
              { value: 'desserts',label: 'Desserts' },
              { value: 'drinks',  label: 'Drinks' },
            ]}
          />
        </Row>
        <Row label="Vertical">
          <div className="w-56">
            <Tabs
              orientation="vertical"
              value={verticalTab}
              onChange={setVerticalTab}
              items={[
                { value: 'starters', label: 'Starters', count: 6 },
                { value: 'mains',    label: 'Mains',    count: 12 },
                { value: 'sides',    label: 'Sides',    count: 4 },
                { value: 'drinks',   label: 'Drinks',   count: 8 },
                { value: 'desserts', label: 'Desserts', count: 5 },
              ]}
            />
          </div>
        </Row>
      </Section>

      <Section title="Cards & alerts">
        <div className="grid gap-3 md:grid-cols-3">
          <Card>Default flat</Card>
          <Card variant="elevated">Elevated</Card>
          <Card variant="hero" radius="lg">Hero (brand soft)</Card>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Alert tone="info"    title="Heads up"   >Operating in counter-service mode. Customers must pay before ordering.</Alert>
          <Alert tone="success" title="All set"     >Razorpay webhook just confirmed payment for order #18421.</Alert>
          <Alert tone="warning" title="Low stock"   >Paneer is below the threshold of 200g.</Alert>
          <Alert tone="error"   title="Payment failed" action={<Button size="sm" variant="outline">Retry</Button>}>
            UPI handle <span className="font-mono">@yesbank</span> rejected the transaction.
          </Alert>
        </div>
      </Section>

      <Section title="Money, monogram & keyboard">
        <Row label="Money">
          <MoneyText amount={249}    className="text-base font-semibold" />
          <MoneyText amount={1289.5} className="text-lg font-bold" />
          <MoneyText amount={42999}  className="text-2xl font-display font-extrabold" />
        </Row>
        <Row label="Food image">
          <div className="w-44"><FoodImage name="Signature Burger" aspect="video" /></div>
          <div className="w-44"><FoodImage name="Truffle Pizza"    aspect="square" rounded="3xl" /></div>
          <div className="w-44"><FoodImage name="Crispy Wings"     aspect="4/3" /></div>
        </Row>
        <Row label="Keyboard">
          <KeyHint keys={['cmd', 'k']} />
          <KeyHint keys="esc" />
          <KeyHint keys={['shift', 'enter']} />
          <KeyHint keys={['ctrl', 'alt', 'del']} />
        </Row>
      </Section>

      <Section title="Skeletons & empty states">
        <Row label="Skeletons">
          <Skeleton width="120px" />
          <Skeleton width="240px" height="20px" />
        </Row>
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-ink-500">Skeleton grid</p>
          <SkeletonGrid count={3} layout="kiosk" />
        </div>
        <div>
          <EmptyState
            icon={ChefHat}
            title="No orders yet"
            message="Once a customer scans a QR code or pays at the kiosk, their order will appear here in real time."
            action={{ label: 'Open kiosk', onClick: () => push({ type: 'info', title: 'Pretend launch' }) }}
          />
        </div>
      </Section>

      <Section title="Modal & sheet & tooltip">
        <Row label="Trigger">
          <Button onClick={() => setModalOpen(true)}>Open modal</Button>
          <Button variant="outline" onClick={() => setFullModalOpen(true)}>Full-screen modal</Button>
          <Button variant="outline" onClick={() => setDrawerOpen(true)}>Open side drawer</Button>
          <Button variant="secondary" onClick={() => setSheetOpen(true)}>Open bottom sheet</Button>
          <Tooltip content="Press ⌘ + K to open the command palette" side="top">
            <Button variant="subtle" iconLeft={<Search className="h-4 w-4" />}>Hover me</Button>
          </Tooltip>
          <Button variant="outline" onClick={() => push({ type: 'success', title: 'Order placed', message: 'KOT sent to kitchen.' })}>
            Push toast
          </Button>
        </Row>
      </Section>

      <Section title="Data table" hint="Sortable, sticky header, expandable rows.">
        <DataTable
          ariaLabel="Demo orders"
          columns={[
            { key: 'id',     header: 'Order',   width: '110px', mono: true, sortable: true, cell: (v) => <span className="font-mono text-xs">#{v}</span> },
            { key: 'table',  header: 'Table',   width: '90px',  sortable: true },
            { key: 'amount', header: 'Total',   align: 'right', mono: true, sortable: true, cell: (v) => <MoneyText amount={v} /> },
            { key: 'channel',header: 'Channel', sortable: true, cell: (v) => <span className="rounded-full bg-surface-100 px-2.5 py-0.5 text-xs font-medium text-ink-700">{v}</span> },
            { key: 'status', header: 'Status',  cell: (v) => <StatusBadge status={v} /> },
          ]}
          renderExpanded={(row) => (
            <div className="text-sm text-ink-700">
              <div className="font-semibold">Items in order #{row.id}</div>
              <ul className="mt-2 space-y-1">
                <li className="flex justify-between"><span>Smash Burger × 2</span><MoneyText amount={498} /></li>
                <li className="flex justify-between"><span>Crispy Wings × 1</span><MoneyText amount={249} /></li>
              </ul>
            </div>
          )}
          rows={[
            { id: '18421', table: 'T-4', amount: 1289.50, channel: 'qr',    status: 'preparing' },
            { id: '18422', table: 'T-2', amount: 549,     channel: 'kiosk', status: 'ready' },
            { id: '18423', table: '—',   amount: 199,     channel: 'web',   status: 'pending' },
            { id: '18424', table: 'T-7', amount: 2249.75, channel: 'desk',  status: 'completed' },
          ]}
        />
      </Section>

      <Section title="Keypad">
        <div className="max-w-xs">
          <div className="mb-3 rounded-xl bg-surface-100 px-4 py-3 text-right font-display text-2xl font-bold tabular-nums">
            {keypad || '0'}
          </div>
          <Keypad value={keypad} onChange={setKeypad} />
        </div>
      </Section>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Confirm cash payment"
        subtitle="Once you confirm, the order is marked paid and released to the kitchen."
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={() => { setModalOpen(false); push({ type: 'success', title: 'Cash confirmed' }) }}>Confirm</Button>
          </>
        }
      >
        <p className="text-sm text-ink-700">Customer is paying ₹1,289.50 in cash for Order #18421.</p>
      </Modal>

      <Modal
        open={fullModalOpen}
        onClose={() => setFullModalOpen(false)}
        size="full"
        title="Full-screen takeover"
        subtitle="Used by kiosk customisation and admin item editor."
      >
        <div className="grid h-full grid-cols-2 gap-6">
          <FoodImage name="Hero" aspect="square" rounded="2xl" />
          <div className="space-y-3">
            <p className="text-sm text-ink-700">A full-screen modal is suitable for flows that need their own canvas.</p>
            <Input label="Name" placeholder="Margherita Pizza" />
            <Input label="Description" placeholder="San Marzano tomato, fior di latte, basil" />
          </div>
        </div>
      </Modal>

      <SideDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Edit menu item"
        subtitle="Smash Burger · ₹249"
        width="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button onClick={() => { setDrawerOpen(false); push({ type: 'success', title: 'Saved' }) }}>Save</Button>
          </>
        }
      >
        <div className="space-y-5">
          <Tabs
            variant="underline"
            value={drawerTab}
            onChange={setDrawerTab}
            items={[
              { value: 'basics',      label: 'Basics' },
              { value: 'variants',    label: 'Variants', count: 3 },
              { value: 'ingredients', label: 'Ingredients', count: 6 },
              { value: 'photo',       label: 'Photo' },
            ]}
          />
          {drawerTab === 'basics' && (
            <div className="space-y-3">
              <Input label="Name" defaultValue="Smash Burger" />
              <Input label="Price" prefix={<span className="font-semibold">₹</span>} defaultValue="249" />
            </div>
          )}
          {drawerTab !== 'basics' && (
            <p className="text-sm text-ink-600">
              Tab content lives here — variants, ingredients, photo upload. This demo just illustrates the chrome.
            </p>
          )}
        </div>
      </SideDrawer>

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Customize your order"
        subtitle="Sizes, removable ingredients and instructions"
        footer={<Button variant="hero" size="lg" fullWidth>Add to bag</Button>}
      >
        <p className="text-sm text-ink-700">Drag the handle down to dismiss, or tap the backdrop.</p>
      </BottomSheet>
    </div>
  )
}
