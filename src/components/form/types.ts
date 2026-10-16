import type { VNodeChild } from 'vue';
import type { z } from 'zod';

export type FieldPath<T> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends string | boolean
        ? K
        : T[K] extends object
          ? `${K}.${FieldPath<T[K]>}`
          : never;
    }[keyof T & string]
  : never;
export type FieldValue<T, P extends string> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? FieldValue<T[K], Rest>
    : never
  : P extends keyof T
    ? T[P]
    : never;
export type FieldState<T> = boolean | ((values: Readonly<T>) => boolean);
export interface FieldContext<V> {
  value: V;
  update: (value: V) => void;
  blur: () => void;
  disabled: boolean;
  readonly: boolean;
  isSubmitting: boolean;
  inputId: string;
  descriptionId: string;
  errorId: string;
  errors: readonly string[];
  registerFocus: (focus: (() => void) | undefined) => void;
  setDraftPending: (pending: boolean) => void;
}
export type FormField<T> = {
  [P in FieldPath<T>]: {
    name: P;
    label: string;
    description?: string;
    hidden?: FieldState<T>;
    disabled?: FieldState<T>;
    readonly?: FieldState<T>;
    submitWhenHidden?: boolean;
    submitWhenDisabled?: boolean;
    rule?: z.ZodType<FieldValue<T, P>, FieldValue<T, P>>;
    render?: (context: FieldContext<FieldValue<T, P>>) => VNodeChild;
  } & (FieldValue<T, P> extends string
    ? {
        control: 'input';
        props?: {
          placeholder?: string;
          type?: 'text' | 'email';
          autocomplete?: string;
          maxlength?: number;
        };
      }
    : { control: 'switch'; props?: { name?: string } });
}[FieldPath<T>];

type HiddenOmission<F> = F extends { hidden: false | undefined }
  ? false
  : 'hidden' extends keyof F
    ? F extends { submitWhenHidden: true }
      ? false
      : true
    : false;
type DisabledOmission<F> = F extends { disabled: false | undefined }
  ? false
  : 'disabled' extends keyof F
    ? F extends { submitWhenDisabled: true }
      ? false
      : true
    : false;
type OmittedPath<F> = F extends { name: infer P extends string }
  ? true extends HiddenOmission<F> | DisabledOmission<F>
    ? P
    : never
  : never;
type ChildPaths<P, K extends string> = P extends `${K}.${infer Child}` ? Child : never;
type OptionalPaths<T, P> = {
  [K in keyof T as K extends P ? never : K]: K extends string
    ? T[K] extends object
      ? OptionalPaths<T[K], ChildPaths<P, K>>
      : T[K]
    : T[K];
} & { [K in keyof T as K extends P ? K : never]?: T[K] };
// AI modified: only conditionally omitted paths become optional, including nested leaves.
export type SubmitValues<T, F extends readonly FormField<T>[]> = OptionalPaths<
  T,
  OmittedPath<F[number]>
>;
export type SubmitOutcome<R> =
  | { status: 'success'; saved: R }
  | { status: 'validation-failed' | 'failed' | 'unknown' | 'not-executed' };
export type GuardOutcome = { status: 'completed' | 'cancelled' | 'blocked' };
export interface FormHandle<R = unknown> {
  validate: () => Promise<boolean>;
  submit: () => Promise<SubmitOutcome<R>>;
  reset: () => Promise<GuardOutcome>;
  focusField: (name: string) => boolean;
  readonly isDirty: boolean;
  readonly isSubmitting: boolean;
}

export type EditorContext = { mode: 'create' } | { mode: 'edit'; id: string | number };

export type FieldSlots<T> = {
  [P in FieldPath<T> as `field-${P}`]?: (context: FieldContext<FieldValue<T, P>>) => VNodeChild;
};

export type FormSlots<T, R> = FieldSlots<T> & {
  actions?: (
    commands: Pick<FormHandle<R>, 'submit' | 'reset' | 'isSubmitting' | 'isDirty'>,
  ) => VNodeChild;
};
