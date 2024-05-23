<template>
      <template v-if="formVersionXml.dataExists">
        <OdkWebForm :form-xml="formVersionXml.data" @submit="handleSubmit" />
      </template>

      <modal id="owf-submission-preview" :state="previewState" hideable backdrop
          @hide="previewState = false">
          <template #title>ODK Web Forms Preview</template>
          <template #body>
            This is the preview of new ODK Web Forms, currently you can only view your forms with it.
          </template>
      </modal>
</template>

<script setup>
import {ref} from 'vue';
import { OdkWebForm } from '@getodk/web-forms';
import useForm from '../../request-data/form';
import { apiPaths } from '../../util/request';
import { noop } from '../../util/util';
import Modal from '../modal.vue';

import '@odk-web-forms/ui-vue/style.css';

const props = defineProps(['projectId', 'xmlFormId']);

const { form, formVersionXml } = useForm();

const previewState = ref(false);

const formInstanceData = ref('');

const defPath = (extension) => {
  const { projectId, xmlFormId, publishedAt } = form;

  return publishedAt != null
    ? apiPaths.formVersionDef(projectId, xmlFormId, form.version, extension)
    : apiPaths.formDraftDef(projectId, xmlFormId, extension);
};

const fetchForm = () => {
  const url = apiPaths.form(props.projectId, props.xmlFormId);
  form.request({ url, extended: true })
    .then(() => {
      formVersionXml.request({ url: defPath('.xml') }).then(() => {
        console.log(formVersionXml);
      }).catch(noop);
    })
    .catch(noop);
}

fetchForm();

var prettifyXml = function(sourceXml)
{
    var xmlDoc = new DOMParser().parseFromString(sourceXml, 'application/xml');
    var xsltDoc = new DOMParser().parseFromString([
        // describes how we want to modify the XML - indent everything
        '<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:strip-space elements="*"/>',
        '  <xsl:template match="para[content-style][not(text())]">', // change to just text() to strip space in text nodes
        '    <xsl:value-of select="normalize-space(.)"/>',
        '  </xsl:template>',
        '  <xsl:template match="node()|@*">',
        '    <xsl:copy><xsl:apply-templates select="node()|@*"/></xsl:copy>',
        '  </xsl:template>',
        '  <xsl:output indent="yes"/>',
        '</xsl:stylesheet>',
    ].join('\n'), 'application/xml');

    var xsltProcessor = new XSLTProcessor();    
    xsltProcessor.importStylesheet(xsltDoc);
    var resultDoc = xsltProcessor.transformToDocument(xmlDoc);
    var resultXml = new XMLSerializer().serializeToString(resultDoc);
    return resultXml;
};

const handleSubmit = (d) => {
  console.log(d);
  previewState.value = true;
  formInstanceData.value = prettifyXml(d.trim());
}
</script>

<style lang="scss">
:root {
  font-size: 16px;
}
html, body {
  background-color: var(--gray-200);
}
</style>