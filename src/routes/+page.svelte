<script>
  import { today, getLocalTimeZone } from '@internationalized/date';
  import PocketBase from 'pocketbase';
  import MobileDatePicker from '$lib/MobileDatePicker.svelte';
  import { chartAction } from '$lib/chartAction.js';
  import { fly } from 'svelte/transition'; // Animation engine
  import Bell from '@lucide/svelte/icons/bell';
  import { onMount } from 'svelte';

  // Update this to your local network IP if testing on your phone
  const pbPath = 'https://kharcha-pani.pockethost.io'

  const pb = new PocketBase(pbPath);

  let rawData = $state([]);
  let dateRange = $state({
    start: today(getLocalTimeZone()).subtract({ days: 30 }),
    end: today(getLocalTimeZone())
  });

  // TOAST STATE
  let toast = $state({ visible: false, message: '' });

  function showToast(msg, duration = 2000) {
    toast.message = msg;
    toast.visible = true;
    if (duration > 0) {
      setTimeout(() => { toast.visible = false; }, duration);
    }
  }

  // Utility to convert VAPID key to Uint8Array required by PushManager
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // GROUPING MATH & DATA DERIVATION
  let chartData = $derived.by(() => {
    let labels = [];
    let balance = [];
    let burn = [];
    let rechargeArr = [];

    // Find the last record index for each day
    const lastIndicesPerDay = new Map();
    for (let i = 0; i < rawData.length; i++) {
      const dateStr = new Date(rawData[i].created).toLocaleDateString('en-GB');
      lastIndicesPerDay.set(dateStr, i);
    }

    let prevBal = null;

    for (let i = 0; i < rawData.length; i++) {
      const currentRecord = rawData[i];
      const payload = currentRecord.json_output || {}; 
      
      const currentBal = parseFloat(payload.AVAILABLE_BALANCE || "0");
      const recharge = parseFloat(payload.RECHARGE_AMOUNT || "0");
      
      const dateObj = new Date(currentRecord.created);
      const dateStr = dateObj.toLocaleDateString('en-GB');
      
      labels.push(dateObj.toLocaleString('en-GB', { 
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
      }));
      
      balance.push(currentBal);
      rechargeArr.push(recharge);

      if (lastIndicesPerDay.get(dateStr) === i) {
        // This is the last record of the day
        if (prevBal === null) {
          burn.push(0);
        } else {
          // Calculate burn rate using last data of previous day and last data of current day
          const dailyBurn = (prevBal + recharge) - currentBal;
          burn.push(dailyBurn > 0 ? dailyBurn.toFixed(2) : 0);
        }
        prevBal = currentBal;
      } else {
        burn.push(null);
      }
    }

    return { labels, balance, burn, recharge: rechargeArr };
  });

  async function fetchConsumptionData() {
    showToast("Loading data...", 0); // Stays visible until overwritten

    try {
      const startFilter = `${dateRange.start.toString()} 00:00:00`;
      const endFilter = `${dateRange.end.add({ days: 1 }).toString()} 00:00:00`;

      const records = await pb.collection('electric_bills').getFullList({
        filter: `created >= "${startFilter}" && created <= "${endFilter}"`,
        sort: 'created',
      });

      rawData = records;
      showToast("Updated!", 2000);
    } catch (error) {
      console.error("Failed to fetch PocketBase data:", error);
      showToast("Error loading data", 3000);
    }
  }

  function resetAndFetch() {
    dateRange = {
      start: today(getLocalTimeZone()).subtract({ days: 30 }),
      end: today(getLocalTimeZone())
    };
    fetchConsumptionData();
  }

  async function subscribeToNotifications() {
    console.log("[Push] Subscribe triggered.");
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn("[Push] Push API or Service Worker not supported.");
      showToast("Push not supported");
      return;
    }

    try {
      showToast("Requesting...", 0);
      console.log("[Push] Requesting Notification permission...");
      const permission = await Notification.requestPermission();
      console.log("[Push] Permission result:", permission);
      
      if (permission !== 'granted') {
        showToast("Permission denied");
        return;
      }

      console.log("[Push] Waiting for service worker registration...");
      const registration = await navigator.serviceWorker.ready;
      console.log("[Push] SW Registration found:", registration);
      
      const publicVapidKey = import.meta.env.VITE_PUBLIC_VAPID_KEY || import.meta.env.PUBLIC_VAPID_KEY || "BAEkBmbs09WMAsxXydrUw49HjRpToavk2b6Yjp7U4fFXD727e9Va8eEWdt_c63WkPZ4b51O1RtPd2IaK9Ac2f0s";
      console.log("[Push] Using VAPID Key:", publicVapidKey);
      
      const convertedVapidKey = urlBase64ToUint8Array(publicVapidKey);
      console.log("[Push] Converted Uint8Array length:", convertedVapidKey.length);

      console.log("[Push] Checking for existing broken subscriptions...");
      const existingSub = await registration.pushManager.getSubscription();
      if (existingSub) {
        console.log("[Push] Found existing subscription. Unsubscribing to reset state...");
        await existingSub.unsubscribe();
        console.log("[Push] Old subscription removed.");
      }

      console.log("[Push] Calling pushManager.subscribe()...");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });
      console.log("[Push] Subscription successful:", subscription);

      const subJson = subscription.toJSON();
      console.log("[Push] Extracted JSON payload:", subJson);
      
      console.log("[Push] Sending to PocketBase...");
      await pb.collection('push_subscriptions').create({
        endpoint: subJson.endpoint,
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth
      });
      console.log("[Push] PocketBase record created successfully!");

      showToast("Subscribed!");
    } catch (err) {
      console.error("[Push] FATAL ERROR:", err);
      showToast("Subscription failed");
    }
  }

  onMount(async () => {
    await fetchConsumptionData();
  });
</script>

<main class="relative flex flex-col h-[100dvh] w-screen overflow-hidden font-sans bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
  
  <!-- TOAST NOTIFICATION DOM -->
  {#if toast.visible}
    <div 
      transition:fly={{ y: -50, duration: 300 }}
      class="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-5 py-2.5 rounded-full shadow-2xl font-semibold text-sm flex items-center gap-3 border border-neutral-800 dark:border-neutral-200"
    >
      <span class="relative flex h-3 w-3">
        {#if toast.message === "Loading data..."}
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
        {/if}
        <span class="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
      </span>
      {toast.message}
    </div>
  {/if}

  <header class="order-1 max-md:landscape:hidden shrink-0 flex items-center justify-between px-4 py-3 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md z-40 border-b border-neutral-200 dark:border-neutral-800">
    <div class="flex items-center gap-2">
      <button onclick={resetAndFetch} class="text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 uppercase tracking-widest transition-colors text-left cursor-pointer">Electricity</button>
      <button onclick={subscribeToNotifications} class="p-1.5 text-neutral-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-colors active:scale-90" title="Enable Daily Push Notifications">
        <Bell class="size-4" />
      </button>
    </div>
    <p class="text-sm font-bold text-emerald-600 dark:text-emerald-400">
      Live: ₹{rawData.length > 0 ? (rawData[rawData.length - 1].json_output?.AVAILABLE_BALANCE || '---') : '---'}
    </p>
  </header>

  <div class="order-2 flex-1 relative w-full h-full p-2 md:p-6 min-h-0 z-10">
    <div class="relative w-full h-full max-w-7xl mx-auto">
      <canvas use:chartAction={chartData}></canvas>
    </div>
  </div>

  <div class="order-3 max-md:landscape:hidden z-50 w-full px-4 pb-4 pt-4 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 md:absolute md:top-3 md:left-1/2 md:-translate-x-1/2 md:w-auto md:px-2 md:py-2 md:border md:rounded-2xl md:bg-white/70 md:dark:bg-neutral-900/70 md:backdrop-blur-xl md:shadow-2xl">
    <div class="flex w-full md:w-auto gap-3 pb-4 md:pb-0">
      <div class="flex-1 md:flex-none md:w-72">
        <MobileDatePicker bind:dateRange={dateRange} />
      </div>
      <button 
        onclick={fetchConsumptionData} 
        class="bg-blue-600 hover:bg-blue-700 transition-colors px-6 py-3 md:py-0 rounded-xl md:rounded-lg text-sm font-bold text-white shadow-lg shadow-blue-600/20 dark:shadow-blue-900/20">
        Show
      </button>
    </div>
  </div>

</main>
