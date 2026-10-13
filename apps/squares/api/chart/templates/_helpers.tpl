{{/*
Expand the name of the chart.
*/}}
{{- define "app.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "app.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "app.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "app.labels" -}}
helm.sh/chart: {{ include "app.chart" . }}
{{ include "app.selectorLabels" . }}
app.kubernetes.io/version: {{ include "squares.imageTag" . | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "app.selectorLabels" -}}
app.kubernetes.io/name: {{ include "app.fullname" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Per-service name, e.g. squares-contests. Call with (dict "root" $ "name" $name).
*/}}
{{- define "squares.serviceName" -}}
{{- printf "%s-%s" (include "app.fullname" .root) .name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Per-service selector labels: the chart's selector labels plus the service as the component.
*/}}
{{- define "squares.serviceSelectorLabels" -}}
{{ include "app.selectorLabels" .root }}
app.kubernetes.io/component: {{ .name }}
{{- end }}

{{/*
Per-service labels.
*/}}
{{- define "squares.serviceLabels" -}}
{{ include "app.labels" .root }}
app.kubernetes.io/component: {{ .name }}
app.kubernetes.io/part-of: {{ include "app.fullname" .root }}-api
{{- end }}

{{/*
Name for resources the chart renders once; the frontend chart already owns the bare fullname.
*/}}
{{- define "squares.apiName" -}}
{{- printf "%s-api" (include "app.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Image tag, defaulting to the chart appVersion that release-please keeps in step with the app.
*/}}
{{- define "squares.imageTag" -}}
{{- .Values.image.tag | default .Chart.AppVersion }}
{{- end }}
