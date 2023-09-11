/*
Copyright (c) 2023 Cisco and/or its affiliates.
This software is licensed to you under the terms of the Cisco Sample
Code License, Version 1.1 (the "License"). You may obtain a copy of the
License at
               https://developer.cisco.com/docs/licenses
All use of the material herein must be in accordance with the terms of
the License. All rights not expressly granted by the License are
reserved. Unless required by applicable law or agreed to separately in
writing, software distributed under the License is distributed on an "AS
IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
or implied.
*/

import xapi from 'xapi';

const RebootTime = "10:00" // time to reboot (24 h)
const RebootDay = "0" // Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6
const force_flag = false // set to true, forces reboot even if device is actively being used, false only reboots when device is available (standby, or not in use)
const daily = false // set to true for daily reboots (RebootDay is ignored, but RebootTime is considered)

function alert(title, text = '', duration = 15) {
  /* Display alert on screen */
  xapi.Command.UserInterface.Message.Alert.Display({
    Title: title,
    Text: text,
    Duration: duration,
  });
}

function schedule(time, day, action) {
  /* Schedule an action to take place on a specific time and day of the weekly (repeats weekly) */
  let [alarmH, alarmM] = time.split(':');

  // Get current day information (day, hour, minutes, seconds)
  let now = new Date();
  let now_day = now.getDay()
  let now_seconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

  // Calculate the difference in seconds
  let difference = parseInt(alarmH) * 3600 + parseInt(alarmM) * 60 - now_seconds;

  if (daily) {
    // If difference is negative, calculate difference until next day at that time, else leave difference as is
    if (difference <= 0) difference += 24 * 3600;

  } else {
    // Calculate the difference in days
    let days_difference = day - now_day

    if (days_difference < 0) {
      days_difference += 7;
    } else if (days_difference == 0) {
      // Special case: same day, check if the time is in the past (perform wrap around), else, only consider seconds difference
      if (difference <= 0) days_difference += 7;
    }

    console.log(`The difference in days until the next reboot ${days_difference}`)

    difference += (days_difference * 24 * 3600);
  }

  console.log(`The difference in seconds until the next reboot ${difference}`)

  // Calculate the future date and time for display
  const futureDate = new Date(now.getTime() + difference * 1000);

  console.log(`The next reboot will happen at: ${futureDate.toLocaleDateString()} ${futureDate.toLocaleTimeString()}`)
  alert('Reboot Macro', `The next reboot will happen at: ${futureDate.toLocaleDateString()} ${futureDate.toLocaleTimeString()}`)

  // Schedule warning alert for 10 minutes before reboot
  let warning_time = difference - 10 * 60
  setTimeout(alert, warning_time * 1000, 'Reboot Macro', 'Device reboot in 10 minutes...')

  return setTimeout(action, difference * 1000);
}


async function rebootDevice() {
  /* Reboot device */
  console.log('Attempting reboot of device...')
  alert('Reboot Macro', `Rebooting Device...`)
  await new Promise(r => setTimeout(r, 10000));

  xapi.Command.SystemUnit.Boot(
    { Action: 'Restart', Force: force_flag });

  /* This section is only hit if the device is unable to reboot due to being in use and the Force flag = false */
  await new Promise(r => setTimeout(r, 10000)); // small sleep to give the system state check a chance to determine if it's in use
  console.log('Unable to reboot device, device currently in use... skipping reboot this round.')
  alert('Reboot Macro', `Unable to Reboot Device, currently in use...`)
  await new Promise(r => setTimeout(r, 10000));

  schedule(RebootTime, RebootDay, rebootDevice);
}

schedule(RebootTime, RebootDay, rebootDevice);
