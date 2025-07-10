import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  StyleSheet,
  GestureResponderEvent,
  Alert,
} from 'react-native';
import { USBPrinter } from 'react-native-thermal-receipt-printer-image-qr';

interface USBPrinterDevice {
  device_id: string;
  device_name: string;
  product_id: number;
  vendor_id: number;
}

const App: React.FC = () => {
  const [printers, setPrinters] = useState<USBPrinterDevice[]>([]);
  const [currentPrinter, setCurrentPrinter] = useState<USBPrinterDevice | null>(null);

  useEffect(() => {
    if (Platform.OS === 'android') {
      USBPrinter.init().then(() => {
        USBPrinter.getDeviceList().then((devices: USBPrinterDevice[]) => {
          console.log(devices);
          setPrinters(devices);
        });
      });
    }
  }, []);

  const _connectPrinter = (printer: USBPrinterDevice) => {
    //4070, 33054
  
    console.log('set ok t');
    USBPrinter.connectPrinter(printer.vendor_id, printer.product_id).then(() => {
      console.log('set ok');
      setCurrentPrinter(printer);
    });
  };

  const printTextTest = () => {
    if (currentPrinter) {
      USBPrinter.printText('<C>sample text</C>\n');
    }
  };

  const printBillTest = () => {
    if (currentPrinter) {
      USBPrinter.printBill('<C>sample bill</C>');
    }
  };

  return (
    <View style={styles.container}>
      {printers.map((printer) => (
        <TouchableOpacity
          key={printer.device_id}
          onPress={() => _connectPrinter(printer)}
          style={styles.printerButton}
        >
          <Text>{`📠 ${printer.device_name} (ID: ${printer.device_id})`}</Text>
          <Text>{`Vendor: ${printer.vendor_id}, Product: ${printer.product_id}`}</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.actionButton} onPress={printTextTest}>
        <Text style={styles.buttonText}>🖨 In Text</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionButton} onPress={printBillTest}>
        <Text style={styles.buttonText}>🧾 In Bill</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  printerButton: {
    padding: 12,
    marginVertical: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
  },
  actionButton: {
    padding: 14,
    marginTop: 20,
    backgroundColor: '#4287f5',
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default App;
