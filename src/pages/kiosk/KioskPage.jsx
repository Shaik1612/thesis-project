import { useCallback, useState } from 'react'
import { useSettings } from '../../lib/SettingsContext'
import { useMenu } from '../../hooks/useMenu'
import { useCart } from '../../hooks/useCart'
import ClosedPage from '../../components/ClosedPage'
import LoadingSpinner from '../../components/LoadingSpinner'
import ItemConfigSheet from '../../components/ItemConfigSheet'
import KioskFrame from './KioskFrame'
import AttractScreen from './AttractScreen'
import OrderTypeScreen from './OrderTypeScreen'
import MenuLayout from './MenuLayout'
import CartPage from './CartPage'
import ItemQuickAdd from './ItemQuickAdd'
import PhoneScreen from './PhoneScreen'
import PaymentScreen from './PaymentScreen'
import DoneScreen from './DoneScreen'
import useIdleReset from './useIdleReset'

// Kiosk state machine: attract → order_type → menu → (phone) → payment → done.
// The phone step is skipped when loyalty is disabled in settings.

const STEPS_WITH_BACK = new Set(['order_type', 'menu', 'cart', 'phone', 'payment'])

export default function KioskPage() {
  const settings = useSettings()
  const { categories, items, loading } = useMenu()
  const cart = useCart(settings.gstRate, settings.gstInclusive)

  const [step, setStep] = useState('attract')
  const [orderType, setOrderType] = useState('dine_in')
  const [activeCategory, setActiveCategory] = useState(null)
  const [pickedItem, setPickedItem] = useState(null)
  const [phone, setPhone] = useState('')

  const resetAll = useCallback(() => {
    cart.clear()
    setPhone('')
    setActiveCategory(null)
    setPickedItem(null)
    setOrderType('dine_in')
    setStep('attract')
  }, [cart])

  useIdleReset({ active: step !== 'attract', onReset: resetAll, idleMs: 90_000 })

  if (!settings.loaded) return <LoadingSpinner fullscreen />
  if (!settings.kioskEnabled) {
    return <ClosedPage title="Kiosk unavailable" message="Please order at the counter." />
  }

  const startOrder = () => setStep('order_type')

  const onCheckout = () => setStep(settings.loyaltyEnabled ? 'phone' : 'payment')

  const backFromMenu    = () => setStep('order_type')
  const backFromCart    = () => setStep('menu')
  const backFromPhone   = () => setStep('menu')
  const backFromPayment = () => setStep(settings.loyaltyEnabled ? 'phone' : 'menu')

  if (step === 'attract') {
    return <AttractScreen items={items} onStart={startOrder} />
  }

  if (step === 'done') {
    return (
      <div className="flex h-screen w-screen flex-col bg-surface-50">
        <DoneScreen orderType={orderType} onReset={resetAll} />
      </div>
    )
  }

  const onBack = STEPS_WITH_BACK.has(step) ? (
    step === 'order_type' ? () => setStep('attract') :
    step === 'menu'       ? backFromMenu :
    step === 'cart'       ? backFromCart :
    step === 'phone'      ? backFromPhone :
    step === 'payment'    ? backFromPayment : undefined
  ) : undefined

  return (
    <KioskFrame
      step={step}
      onBack={onBack}
      onCart={() => setStep('cart')}
      cartCount={cart.totalItems}
    >
      {step === 'order_type' && (
        <OrderTypeScreen onPick={(v) => { setOrderType(v); setStep('menu') }} />
      )}

      {step === 'menu' && (
        <>
          <MenuLayout
            categories={categories}
            items={items}
            loading={loading}
            activeCategory={activeCategory ?? categories[0]?.id ?? null}
            onPickCategory={setActiveCategory}
            cart={cart}
            onPickItem={setPickedItem}
            onReviewCart={() => setStep('cart')}
          />
        </>
      )}

      {step === 'cart' && (
        <CartPage
          cart={cart}
          items={items}
          gstRate={settings.gstRate}
          onAddItem={setPickedItem}
          onCheckout={onCheckout}
        />
      )}

      {step === 'phone' && (
        <PhoneScreen
          phone={phone}
          onPhoneChange={setPhone}
          onSkip={() => { setPhone(''); setStep('payment') }}
          onContinue={() => setStep('payment')}
        />
      )}

      {step === 'payment' && (
        <PaymentScreen
          cart={cart}
          items={items}
          gstRate={settings.gstRate}
          phone={phone}
          orderType={orderType}
          onConfirmed={() => setStep('done')}
        />
      )}

      {pickedItem && pickedItem.hasOptions ? (
        <ItemConfigSheet
          open
          item={pickedItem}
          onClose={() => setPickedItem(null)}
          onAdd={(config) => cart.add(pickedItem, config)}
        />
      ) : pickedItem ? (
        <ItemQuickAdd
          item={pickedItem}
          qty={cart.quantityFor(pickedItem.id)}
          onAdd={() => cart.add(pickedItem)}
          onRemove={() => cart.remove(pickedItem.id)}
          onClose={() => setPickedItem(null)}
        />
      ) : null}

    </KioskFrame>
  )
}
