import { Button as PayloadButton } from '@payloadcms/ui';

export type PayloadUIButtonProps = React.ComponentProps<typeof PayloadButton>;

export function PayloadUIButton(props: PayloadUIButtonProps) {
  return <PayloadButton {...props} />;
}
