import { Alert, Platform } from 'react-native';

type AlertArgs = Parameters<typeof Alert.alert>;
type DialogButton = { style?: unknown; onPress?: unknown };

function press(button: DialogButton | undefined): void {
  if (typeof button?.onPress === 'function') (button.onPress as () => void)();
}

/**
 * React Native's Alert does nothing in a web browser, so confirmations and error messages would
 * silently disappear there. On web, route Alert.alert through the browser's own dialogs.
 * On Android and iOS this file changes nothing.
 */
if (Platform.OS === 'web') {
  const browser = globalThis as unknown as {
    alert?: (message: string) => void;
    confirm?: (message: string) => boolean;
  };

  Alert.alert = (title: AlertArgs[0], message?: AlertArgs[1], buttons?: AlertArgs[2]) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    const list: DialogButton[] = Array.isArray(buttons) ? buttons : [];
    if (list.length <= 1) {
      browser.alert?.(text);
      press(list[0]);
      return;
    }
    const cancel = list.find((b) => b.style === 'cancel');
    const confirmButton = list.find((b) => b.style !== 'cancel');
    if (browser.confirm?.(text)) press(confirmButton);
    else press(cancel);
  };
}
