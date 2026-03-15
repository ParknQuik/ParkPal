#!/usr/bin/env node
/**
 * Get local network IP address
 * This script finds the Mac's IP address on the local network
 * Used for connecting physical devices to local backend
 */

const os = require('os');

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();

  // Priority order: en0 (Wi-Fi), en1 (Ethernet), others
  const priorities = ['en0', 'en1'];

  // Try priority interfaces first
  for (const ifaceName of priorities) {
    const iface = interfaces[ifaceName];
    if (iface) {
      const ipv4 = iface.find(addr => addr.family === 'IPv4' && !addr.internal);
      if (ipv4) {
        return ipv4.address;
      }
    }
  }

  // Fallback: find any IPv4 address
  for (const ifaceName in interfaces) {
    const iface = interfaces[ifaceName];
    const ipv4 = iface.find(addr => addr.family === 'IPv4' && !addr.internal);
    if (ipv4) {
      return ipv4.address;
    }
  }

  return 'localhost';
}

const ip = getLocalIpAddress();
console.log(ip);
