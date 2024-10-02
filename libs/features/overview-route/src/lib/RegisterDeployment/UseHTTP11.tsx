import { FormFieldCheckbox } from '@restate/ui/form-field';

export function UseHTTP11() {
  return (
    <FormFieldCheckbox
      name="use_http_11"
      className="self-baseline mt-0.5"
      value="true"
      direction="right"
    >
      <span slot="title" className="text-sm font-medium text-gray-700">
        Use <code>HTTP1.1</code>
      </span>
      <br />
      <span
        slot="description"
        className="leading-5 text-code block text-gray-500"
      >
        If selected, discovery will use a client defaulting to{' '}
        <code>HTTP1.1</code>. <code>HTTP2</code> may be used for{' '}
        <code>TLS</code> servers advertising <code>HTTP2</code> support via
        ALPN. HTTP1.1 will work only in request-response mode.
      </span>
    </FormFieldCheckbox>
  );
}
