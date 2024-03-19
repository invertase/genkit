/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { OperationSchema, getLocation } from '@genkit-ai/common';
import {
  Flow,
  FlowWrapper,
  StepsFunction,
  flow,
  FlowAuthPolicy,
} from '@genkit-ai/flow';
import {
  HttpsFunction,
  HttpsOptions,
  onRequest,
} from 'firebase-functions/v2/https';
import * as z from 'zod';
import * as express from 'express';
import { callHttpsFunction } from './helpers';

export type FunctionFlow<
  I extends z.ZodTypeAny,
  O extends z.ZodTypeAny,
  S extends z.ZodTypeAny
> = HttpsFunction & FlowWrapper<I, O, S>;

export interface FunctionFlowAuth {
  provider: express.RequestHandler;
  policy: FlowAuthPolicy;
}

interface FunctionFlowConfig<
  I extends z.ZodTypeAny,
  O extends z.ZodTypeAny,
  S extends z.ZodTypeAny
> {
  name: string;
  input: I;
  output: O;
  authPolicy: FunctionFlowAuth;
  streamType?: S;
  httpsOptions?: HttpsOptions;
}

/**
 * Creates a flow backed by Cloud Functions for Firebase gen2 HTTPS function.
 */
export function onFlow<
  I extends z.ZodTypeAny,
  O extends z.ZodTypeAny,
  S extends z.ZodTypeAny
>(
  config: FunctionFlowConfig<I, O, S>,
  steps: StepsFunction<I, O, S>
): FunctionFlow<I, O, S> {
  const f = flow(
    {
      ...config,
      authPolicy: config.authPolicy.policy,
      invoker: async (flow, data, streamingCallback) => {
        const responseJson = await callHttpsFunction(
          flow.name,
          getLocation() || 'us-central1',
          data,
          streamingCallback
        );
        return OperationSchema.parse(JSON.parse(responseJson));
      },
    },
    steps
  );

  const wrapped = wrapHttpsFlow(f, config);

  const funcFlow = wrapped as FunctionFlow<I, O, S>;
  funcFlow.flow = f;

  return funcFlow;
}

function wrapHttpsFlow<
  I extends z.ZodTypeAny,
  O extends z.ZodTypeAny,
  S extends z.ZodTypeAny
>(flow: Flow<I, O, S>, config: FunctionFlowConfig<I, O, S>): HttpsFunction {
  return onRequest(
    {
      ...config.httpsOptions,
      memory: config.httpsOptions?.memory || '512MiB',
    },
    async (req, res) => {
      await config.authPolicy.provider(req, res, () =>
        flow.expressHandler(req, res)
      );
    }
  );
}

/**
 * Indicates that no authorization is in effect.
 *
 * WARNING: If you are using Cloud Functions for Firebase with no IAM policy,
 * this will allow anyone on the internet to execute this flow.
 */
export function noAuth(): FunctionFlowAuth {
  return {
    provider: (req, res, next) => next(),
    policy: () => {},
  };
}
