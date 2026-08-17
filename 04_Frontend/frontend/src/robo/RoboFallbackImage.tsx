import { ROBO_ASSET_SRC } from './robo-interaction';

export function RoboFallbackImage({ showEyes = false }: { showEyes?: boolean }) {
  return (
    <>
      <img src={ROBO_ASSET_SRC} alt="" draggable={false} />
      {showEyes ? (
        <span className="robo-eye-stage">
          <span className="robo-eye is-left" />
          <span className="robo-eye is-right" />
        </span>
      ) : null}
      <span className="robo-lids" />
    </>
  );
}
