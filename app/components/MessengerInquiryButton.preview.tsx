import MessengerInquiryButton, {
  type MessengerInquiryPreviewState,
  type MessengerInquiryState,
} from './MessengerInquiryButton'

const interactionStates: MessengerInquiryPreviewState[] = ['default', 'hover', 'focus', 'active']
const asyncStates: MessengerInquiryState[] = ['loading', 'error', 'success']

export default function MessengerInquiryButtonPreview() {
  return (
    <section aria-label="Messenger inquiry button states">
      <div>
        <p>open menu</p>
        <MessengerInquiryButton productName="Ceramic Vase" preview previewOpen />
      </div>
      {interactionStates.map((state) => (
        <div key={state}>
          <p>{state}</p>
          <MessengerInquiryButton productName="Ceramic Vase" preview previewState={state} />
        </div>
      ))}
      <div>
        <p>disabled</p>
        <MessengerInquiryButton productName="Ceramic Vase" preview disabled />
      </div>
      {asyncStates.map((state) => (
        <div key={state}>
          <p>{state}</p>
          <MessengerInquiryButton productName="Ceramic Vase" preview state={state} />
        </div>
      ))}
    </section>
  )
}
