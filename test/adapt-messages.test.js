/**
 * Copyright (c) 2017 - present, Botfuel (https://www.botfuel.io).
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const IadvizeAdapter = require('../src/adapters/iadvize-adapter');
const { adaptMessage } = require('../src/utils/iadvize-adapter-utils');

describe('adapting messages', () => {
  test('should generate the proper text message json', () => {
    expect(
      adaptMessage({
        id: 1,
        payload: {
          value: 'Hello bot',
        },
        sender: 'bot',
        type: 'text',
      }),
    ).toEqual({
      type: 'message',
      payload: {
        contentType: 'text',
        value: 'Hello bot',
      },
      quickReplies: [],
    });
  });

  test('should generate the proper quickreplies message json', () => {
    expect(
      adaptMessage({
        id: 1,
        payload: {
          value: ['yes', 'no'],
        },
        sender: 'bot',
        type: 'quickreplies',
      }),
    ).toEqual({
      type: 'message',
      payload: {
        contentType: 'text',
        value: '',
      },
      quickReplies: [
        {
          contentType: 'text/quick-reply',
          value: 'yes',
          idQuickReply: 'yes',
        },
        {
          contentType: 'text/quick-reply',
          value: 'no',
          idQuickReply: 'no',
        },
      ],
    });
  });

  test('should generate the proper quickreplies message json', () => {
    expect(
      adaptMessage({
        id: 1,
        payload: {
          value: ['yes', 'no'],
          options: {
            text: 'QuickReplies text option',
          },
        },
        sender: 'bot',
        type: 'quickreplies',
      }),
    ).toEqual({
      type: 'message',
      payload: {
        contentType: 'text',
        value: 'QuickReplies text option',
      },
      quickReplies: [
        {
          contentType: 'text/quick-reply',
          value: 'yes',
          idQuickReply: 'yes',
        },
        {
          contentType: 'text/quick-reply',
          value: 'no',
          idQuickReply: 'no',
        },
      ],
    });
  });

  test('should generate the proper close message json', () => {
    expect(
      adaptMessage({
        id: 1,
        payload: null,
        sender: 'bot',
        type: 'close',
      }),
    ).toEqual({ type: 'close' });
  });
});

describe('Close settings', () => {
  test('should generate the proper close settings when no configuration provided', () => {
    const adapter = new IadvizeAdapter({ config: { adapter: {} } });
    expect(adapter.closeSettings).toEqual({
      closeDelay: 30,
      closeWarningDelay: 30, // 300 * 0.9
      closeWarningMessage: 'The conversation will be closed in a few seconds',
    });
  });

  test('should generate the proper close settings when close conversation settings provided', () => {
    const adapter = new IadvizeAdapter({
      config: {
        adapter: {
          closeDelay: 100,
        },
      },
    });
    expect(adapter.closeSettings).toEqual({
      closeDelay: 100,
      closeWarningDelay: 30,
      closeWarningMessage: 'The conversation will be closed in a few seconds',
    });
  });

  test('should generate the proper close settings when close conversation settings provided (2)', () => {
    const adapter = new IadvizeAdapter({
      config: {
        adapter: {
          closeDelay: 100,
          closeWarningDelay: 80,
        },
      },
    });
    expect(adapter.closeSettings).toEqual({
      closeDelay: 100,
      closeWarningDelay: 80,
      closeWarningMessage: 'The conversation will be closed in a few seconds',
    });
  });

  test('should generate the proper close settings when close conversation settings provided (3)', () => {
    const adapter = new IadvizeAdapter({
      config: {
        adapter: {
          closeDelay: 200,
          closeWarningDelay: 100,
          closeWarningMessage: 'This conversation will be closed soon ...',
        },
      },
    });
    expect(adapter.closeSettings).toEqual({
      closeDelay: 200,
      closeWarningDelay: 100,
      closeWarningMessage: 'This conversation will be closed soon ...',
    });
  });

  test('should generate the proper close settings when close conversation settings provided (4)', () => {
    const adapter = new IadvizeAdapter({
      config: {
        adapter: {
          closeDelay: 400,
          closeWarningDelay: 300,
          closeWarningMessage: delay => `The conversation will be closed in ${delay} seconds`,
        },
      },
    });
    expect(adapter.closeSettings).toEqual({
      closeDelay: 400,
      closeWarningDelay: 300,
      closeWarningMessage: 'The conversation will be closed in 400 seconds',
    });
  });

  test('should generate the proper close settings when the close conversation delay provided is not a number', () => {
    const adapter = new IadvizeAdapter({
      config: {
        adapter: {
          closeDelay: 'delay',
        },
      },
    });
    expect(adapter.closeSettings).toEqual({
      closeDelay: 30,
      closeWarningDelay: 30,
      closeWarningMessage: 'The conversation will be closed in a few seconds',
    });
  });

  test('should generate the proper close settings when the close settings delay provided are not numbers', () => {
    const adapter = new IadvizeAdapter({
      config: {
        adapter: {
          closeDelay: 'delay',
          closeWarningDelay: 'closeWarningDelay',
        },
      },
    });
    expect(adapter.closeSettings).toEqual({
      closeDelay: 30,
      closeWarningDelay: 30,
      closeWarningMessage: 'The conversation will be closed in a few seconds',
    });
  });
});
