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

const TEST_USER = 'TEST_USER';

describe('adapting messages', () => {
  const adapter = new IadvizeAdapter();

  test('should generate the proper text message json', () => {
    expect(
      adapter.adaptMessage({
        id: 1,
        payload: {
          value: 'Hello bot',
        },
        sender: 'bot',
        type: 'text',
      })
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
      adapter.adaptMessage({
        id: 1,
        payload: {
          value: ['yes', 'no'],
        },
        sender: 'bot',
        type: 'quickreplies',
      })
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
});
