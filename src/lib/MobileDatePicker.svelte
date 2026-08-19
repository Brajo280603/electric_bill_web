<script>
  import { DateRangePicker } from "bits-ui";
  import { cn } from "$lib/utils.js";
  import CalendarIcon from "@lucide/svelte/icons/calendar"; 
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";

  let { dateRange = $bindable() } = $props();
</script>

<DateRangePicker.Root bind:value={dateRange}>
  
  <!-- FIX: Use the actual Trigger component to handle the open/close state -->
  <DateRangePicker.Trigger 
    class="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 text-sm font-medium text-neutral-800 dark:text-neutral-200 active:scale-[0.98] transition-all"
  >
    <CalendarIcon class="size-4 text-neutral-500 dark:text-neutral-400" />
    {#if dateRange?.start && dateRange?.end}
      {dateRange.start.month}/{dateRange.start.day} - {dateRange.end.month}/{dateRange.end.day}
    {:else}
      Select Range
    {/if}
  </DateRangePicker.Trigger>

  <DateRangePicker.Content 
    side="bottom" 
    sideOffset={8}
    class="z-50 w-screen sm:w-auto px-2 pb-4 sm:p-0"
  >
    <DateRangePicker.Calendar class="w-full rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-2xl shadow-black/10 dark:shadow-black/50">
      
      {#snippet children({ months, weekdays })}
        <DateRangePicker.Header class="flex items-center justify-between mb-4">
          <DateRangePicker.PrevButton class="inline-flex size-10 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 active:scale-95 text-neutral-800 dark:text-neutral-200 transition-all">
            <ChevronLeft class="size-5" />
          </DateRangePicker.PrevButton>
          
          <DateRangePicker.Heading class="text-base font-semibold text-neutral-900 dark:text-neutral-100" />
          
          <DateRangePicker.NextButton class="inline-flex size-10 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 active:scale-95 text-neutral-800 dark:text-neutral-200 transition-all">
            <ChevronRight class="size-5" />
          </DateRangePicker.NextButton>
        </DateRangePicker.Header>

        <div class="flex flex-col space-y-4">
          {#each months as month (month.value)}
            <DateRangePicker.Grid class="w-full border-collapse select-none">
              
              <DateRangePicker.GridHead>
                <DateRangePicker.GridRow class="flex w-full justify-between mb-2">
                  {#each weekdays as day, i (i)}
                    <DateRangePicker.HeadCell class="w-10 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                      {day.slice(0, 2)}
                    </DateRangePicker.HeadCell>
                  {/each}
                </DateRangePicker.GridRow>
              </DateRangePicker.GridHead>

              <DateRangePicker.GridBody>
                {#each month.weeks as weekDates (weekDates)}
                  <DateRangePicker.GridRow class="flex w-full mt-1">
                    {#each weekDates as date (date)}
                      <DateRangePicker.Cell {date} month={month.value} class="relative size-10 p-0 text-center text-sm focus-within:z-20">
                        
                        <DateRangePicker.Day class={cn(
                          "inline-flex size-10 items-center justify-center whitespace-nowrap rounded-lg bg-transparent p-0 text-sm font-medium text-neutral-800 dark:text-neutral-200 transition-all active:scale-95",
                          "hover:border hover:border-neutral-300 dark:hover:border-neutral-600",
                          "data-highlighted:bg-neutral-100 dark:data-highlighted:bg-neutral-800",
                          "data-selected:bg-neutral-100 dark:data-selected:bg-neutral-800",
                          "data-selection-start:bg-blue-600 data-selection-start:text-white data-selection-start:font-bold",
                          "data-selection-end:bg-blue-600 data-selection-end:text-white data-selection-end:font-bold",
                          "data-selected:[&:not([data-selection-start])]:[&:not([data-selection-end])]:rounded-none",
                          "data-selected:[&:not([data-selection-start])]:[&:not([data-selection-end])]:bg-blue-100 dark:data-selected:[&:not([data-selection-start])]:[&:not([data-selection-end])]:bg-blue-900/30",
                          "data-outside-month:text-neutral-400 dark:data-outside-month:text-neutral-700 data-outside-month:pointer-events-none",
                          "data-unavailable:text-neutral-400 dark:data-unavailable:text-neutral-700 data-unavailable:line-through"
                        )}>
                          {date.day}
                        </DateRangePicker.Day>

                      </DateRangePicker.Cell>
                    {/each}
                  </DateRangePicker.GridRow>
                {/each}
              </DateRangePicker.GridBody>
              
            </DateRangePicker.Grid>
          {/each}
        </div>
      {/snippet}

    </DateRangePicker.Calendar>
  </DateRangePicker.Content>
</DateRangePicker.Root>