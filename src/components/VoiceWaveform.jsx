export default function VoiceWaveform({ active, mode }) {
  return (
    <div className={'voice-wave ' + (active ? 'voice-wave-active' : '')} aria-hidden="true">
      {Array.from({ length: 22 }, (_, index) => (
        <i
          key={index}
          style={{
            '--wave-index': index,
            '--wave-delay': (index % 7) * -0.08 + 's',
          }}
        />
      ))}
      <span>{mode}</span>
    </div>
  )
}
