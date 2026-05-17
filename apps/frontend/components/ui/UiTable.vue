<template>
  <div class="rounded-xl border border-p-border bg-p-elevated overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-p-border bg-p-raised/50">
            <slot name="head" />
          </tr>
        </thead>
        <tbody class="divide-y divide-p-border">
          <slot />
        </tbody>
      </table>
    </div>
  </div>
</template>
