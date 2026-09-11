import { LivenessController } from './liveness.controller';

describe('LivenessController', () => {
  it('returns ok status on health root endpoint', () => {
    const controller = new LivenessController();

    expect(controller.check()).toEqual({ status: 'ok' });
  });

  it('returns ok status on explicit live endpoint', () => {
    const controller = new LivenessController();

    expect(controller.live()).toEqual({ status: 'ok' });
  });
});
