"use client"

import { useEffect, useRef, useState } from 'react'
import {
  ArrowUpRight,
  Check,
  CircleDot,
  LoaderCircle,
  MessageCircle,
  TriangleAlert,
  X,
} from 'lucide-react'
import { Facebook, Instagram, Messenger } from '@thesvg/react'
import styles from './MessengerInquiryButton.module.css'

const MESSENGER_INBOX_URL = 'https://m.me/Terra.home.studio'
const FACEBOOK_PAGE_URL = 'https://web.facebook.com/Terra.home.studio/'
const INSTAGRAM_PROFILE_URL = 'https://www.instagram.com/terra.home.studio/'

export type MessengerInquiryState = 'default' | 'loading' | 'error' | 'success'
export type MessengerInquiryPreviewState = 'default' | 'hover' | 'focus' | 'active'

type MessengerInquiryButtonProps = {
  productName: string
  state?: MessengerInquiryState
  disabled?: boolean
  preview?: boolean
  previewState?: MessengerInquiryPreviewState
  previewOpen?: boolean
}

function ButtonIcon({ state, disabled, open }: { state: MessengerInquiryState; disabled: boolean; open: boolean }) {
  if (disabled) {
    return <MessageCircle aria-hidden="true" className={styles.icon} />
  }

  if (state === 'loading') {
    return <LoaderCircle aria-hidden="true" className={`${styles.icon} ${styles.spinner}`} />
  }

  if (state === 'error') {
    return <TriangleAlert aria-hidden="true" className={styles.icon} />
  }

  if (state === 'success') {
    return <Check aria-hidden="true" className={styles.icon} />
  }

  return open ? (
    <X aria-hidden="true" className={`${styles.icon} ${styles.iconClose}`} />
  ) : (
    <MessageCircle aria-hidden="true" className={styles.icon} />
  )
}

export default function MessengerInquiryButton({
  productName,
  state = 'default',
  disabled = false,
  preview = false,
  previewState = 'default',
  previewOpen = false,
}: MessengerInquiryButtonProps) {
  const [open, setOpen] = useState(previewOpen)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const isUnavailable = disabled || state === 'loading'
  const visualState = disabled ? 'disabled' : state

  useEffect(() => {
    if (!open || preview) return

    panelRef.current?.querySelector<HTMLAnchorElement>('a')?.focus()

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, preview])

  return (
    <div
      ref={rootRef}
      className={styles.root}
      data-preview={preview ? 'true' : undefined}
    >
      {open ? (
        <div
          ref={panelRef}
          id="contact-channel-menu"
          role="menu"
          aria-label="ช่องทางติดต่อสอบถาม"
          className={styles.panel}
        >
          {/* Header */}
          <div className={styles.panelHeader}>
            <div className={styles.brandCenterWrap}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Terra Home Studio" className={styles.brandCenterLogo} />

            </div>

            <div className={styles.headerContent}>
              <h3 className={styles.headerTitle}>สอบถาม & สั่งซื้อสินค้า</h3>
              {productName ? (
                <p className={styles.headerSubtitle} title={productName}>
                  <span className={styles.productTag}>ชิ้นที่สนใจ</span>
                  <span className={styles.productNameText}>{productName}</span>
                </p>
              ) : null}
            </div>
          </div>

          {/* Channel Cards */}
          <div className={styles.channelList}>
            <a
              href={MESSENGER_INBOX_URL}
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              data-analytics-event={preview ? undefined : 'open_messenger_inquiry'}
              className={`${styles.channel} ${styles.channelMessenger}`}
              onClick={() => setOpen(false)}
            >
              <span className={styles.channelIconWrap} data-channel="messenger">
                <Messenger className={styles.brandIconTheSvg} />
              </span>
              <div className={styles.channelInfo}>
                <div className={styles.channelTitleRow}>
                  <span className={styles.channelName}>Messenger</span>
                </div>
                <span className={styles.channelDesc}>Inbox</span>
              </div>
              <div className={styles.arrowWrap}>
                <ArrowUpRight aria-hidden="true" className={styles.channelArrow} />
              </div>
            </a>

            <a
              href={INSTAGRAM_PROFILE_URL}
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              data-analytics-event={preview ? undefined : 'open_instagram_profile'}
              className={`${styles.channel} ${styles.channelInstagram}`}
              onClick={() => setOpen(false)}
            >
              <span className={styles.channelIconWrap} data-channel="instagram">
                <Instagram className={styles.brandIconTheSvg} />
              </span>
              <div className={styles.channelInfo}>
                <div className={styles.channelTitleRow}>
                  <span className={styles.channelName}>Instagram DM</span>
                </div>
                <span className={styles.channelDesc}>@terra.home.studio · ดูรูปและมุมจัดวาง</span>
              </div>
              <div className={styles.arrowWrap}>
                <ArrowUpRight aria-hidden="true" className={styles.channelArrow} />
              </div>
            </a>

            <a
              href={FACEBOOK_PAGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              data-analytics-event={preview ? undefined : 'open_facebook_page'}
              className={`${styles.channel} ${styles.channelFacebook}`}
              onClick={() => setOpen(false)}
            >
              <span className={styles.channelIconWrap} data-channel="facebook">
                <Facebook className={styles.brandIconTheSvg} />
              </span>
              <div className={styles.channelInfo}>
                <div className={styles.channelTitleRow}>
                  <span className={styles.channelName}>Facebook Page</span>
                </div>
                <span className={styles.channelDesc}>Terra Home Studio · ติดตามคอลเลกชันใหม่</span>
              </div>
              <div className={styles.arrowWrap}>
                <ArrowUpRight aria-hidden="true" className={styles.channelArrow} />
              </div>
            </a>
          </div>

          {/* Footer Note */}
          <div className={styles.panelFooter}>
            <CircleDot className={styles.footerIcon} aria-hidden="true" />
            <span>ยินดีให้คำปรึกษา</span>
          </div>
        </div>
      ) : null}

      <button
        ref={triggerRef}
        type="button"
        disabled={isUnavailable}
        aria-label={open ? 'ปิดช่องทางติดต่อ' : `เลือกช่องทางเพื่อสอบถามเกี่ยวกับ ${productName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="contact-channel-menu"
        data-analytics-event={isUnavailable || preview ? undefined : 'open_contact_channels'}
        data-state={visualState}
        data-preview-state={preview ? previewState : undefined}
        data-open={open ? 'true' : 'false'}
        className={styles.trigger}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={styles.triggerContent}>
          <ButtonIcon state={state} disabled={disabled} open={open} />
          {!open && <span className={styles.triggerLabel}>สอบถามสินค้า</span>}
        </span>
      </button>
    </div>
  )
}

