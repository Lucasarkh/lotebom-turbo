<template>
  <ProjectLandingView />
</template>

<script setup lang="ts">
import ProjectLandingView from '~/components/ProjectLandingView.vue'
import { useTenantStore } from '~/stores/tenant'
import {
  buildAbsoluteUrl,
  buildCanonicalUrl,
  buildRobotsContent,
  resolvePublicSiteOrigin,
  resolveSeoImage,
} from '~/utils/seo'

type PublicProject = {
  name?: string
  description?: string
  preLaunchEnabled?: boolean
  preLaunchCaptureMode?: 'QUEUE' | 'RESERVATION'
  ogLogoUrl?: string
  bannerImageUrl?: string
  bannerImageTabletUrl?: string
  bannerImageMobileUrl?: string
}

const isPreLaunchReservationMode = computed(
  () => projectData.value?.preLaunchEnabled && projectData.value?.preLaunchCaptureMode === 'RESERVATION'
)

const tenantStore = useTenantStore()
const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const requestUrl = useRequestURL()

const slug = computed(() => String(route.params.slug || '').trim())
const apiBase = computed(() => String(runtimeConfig.public.apiBase || '').replace(/\/+$/, ''))
const siteOrigin = computed(() => {
  return resolvePublicSiteOrigin(runtimeConfig.public.siteUrl, requestUrl.origin)
})

const { data: projectData } = await useAsyncData<PublicProject | null>(
  () => `seo-project-page-${slug.value}`,
  async () => {
    if (!slug.value) return null
    try {
      return await $fetch<PublicProject>(`${apiBase.value}/api/p/${encodeURIComponent(slug.value)}`)
    } catch {
      return null
    }
  },
  { server: true, default: () => null },
)

const seoTitle = computed(() => {
  if (isPreLaunchReservationMode.value && projectData.value?.name) {
    return `Pre-lancamento ${projectData.value.name} - Reserva antecipada exclusiva | Lotio`
  }
  if (projectData.value?.preLaunchEnabled && projectData.value?.name) {
    return `Pre-lancamento ${projectData.value.name} - Acesso antecipado exclusivo | Lotio`
  }
  if (projectData.value?.name) {
    return `Loteamento ${projectData.value.name} - Lotio`
  }
  return 'Empreendimento - Lotio'
})
const seoDescription = computed(
  () => {
    if (isPreLaunchReservationMode.value) {
      if (projectData.value?.name) {
        return `Conheça o pré-lançamento ${projectData.value.name} com reserva antecipada para lotes disponíveis e fila de preferência para unidades já disputadas.`
      }
      return 'Conheça o pré-lançamento com reserva antecipada para lotes disponíveis e fila de preferência para unidades já disputadas.'
    }

    if (projectData.value?.preLaunchEnabled) {
      if (projectData.value?.name) {
        return `Entre na fila de preferência do ${projectData.value.name} e garanta atendimento prioritário, acesso antecipado e condições exclusivas antes da abertura oficial do lançamento.`
      }
      return 'Entre na fila de preferência e garanta acesso antecipado exclusivo antes da abertura oficial do lançamento.'
    }

    return projectData.value?.description
      || (projectData.value?.name
        ? `Conheça o empreendimento ${projectData.value.name} e veja os lotes disponíveis.`
        : 'Conheça os empreendimentos disponíveis na Lotio.')
  },
)
const seoImage = computed(
  () =>
    resolveSeoImage(
      siteOrigin.value,
      projectData.value?.ogLogoUrl,
      projectData.value?.bannerImageUrl,
      projectData.value?.bannerImageTabletUrl,
      projectData.value?.bannerImageMobileUrl,
      '/img/og-image.png',
    ),
)
const seoUrl = computed(() => buildCanonicalUrl(siteOrigin.value, route.path || `/${slug.value}`))
const robotsContent = computed(() => buildRobotsContent(false))
const seoSchema = computed(() => ([
  {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: seoTitle.value,
    description: seoDescription.value,
    url: seoUrl.value,
    primaryImageOfPage: seoImage.value,
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Residence',
    name: projectData.value?.name || seoTitle.value,
    description: seoDescription.value,
    url: seoUrl.value,
    image: seoImage.value,
  },
]))

useSeoMeta({
  title: seoTitle,
  description: seoDescription,
  ogType: 'website',
  ogTitle: seoTitle,
  ogDescription: seoDescription,
  ogUrl: seoUrl,
  ogImage: seoImage,
  ogSiteName: computed(() => projectData.value?.name || 'Lotio'),
  twitterCard: 'summary_large_image',
  twitterTitle: seoTitle,
  twitterDescription: seoDescription,
  twitterImage: seoImage,
  robots: robotsContent,
})

useHead(() => ({
  link: [
    { rel: 'canonical', href: seoUrl.value },
    { rel: 'image_src', href: seoImage.value },
  ],
  script: [
    {
      key: 'project-landing-ld-json',
      type: 'application/ld+json',
      innerHTML: JSON.stringify(seoSchema.value),
    },
  ],
}))

// On custom domains the project is served at "/". Redirect /:slug → / once
// the tenant context confirms this slug belongs to the current domain.
watch(
  () => tenantStore.isLoaded,
  (loaded) => {
    if (loaded && tenantStore.config?.project?.slug === route.params.slug) {
      navigateTo('/', { replace: true })
    }
  },
  { immediate: true },
)

definePageMeta({
  layout: 'public'
})
</script>
