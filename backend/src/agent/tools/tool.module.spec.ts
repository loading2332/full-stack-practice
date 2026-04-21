import { Provider } from '@nestjs/common';
import { buildToolProvider } from './tool.module';

describe('buildToolProvider', () => {
  class FakeToolService {
    tool = { name: 'real-tool' };
  }

  it('returns a mock provider in mock mode', () => {
    const mockTool = { name: 'mock-tool' };

    const provider = buildToolProvider(
      'FAKE_TOOL',
      FakeToolService,
      mockTool,
      true,
    ) as Provider & { useValue?: unknown };

    expect(provider).toEqual({
      provide: 'FAKE_TOOL',
      useValue: mockTool,
    });
  });

  it('returns a factory provider in real mode that extracts svc.tool', () => {
    const provider = buildToolProvider(
      'FAKE_TOOL',
      FakeToolService,
      { name: 'mock-tool' },
      false,
    ) as Provider & {
      inject?: unknown[];
      useFactory?: (svc: FakeToolService) => unknown;
    };

    expect(provider.provide).toBe('FAKE_TOOL');
    expect(provider.inject).toEqual([FakeToolService]);
    expect(provider.useFactory?.(new FakeToolService())).toEqual({
      name: 'real-tool',
    });
  });
});
