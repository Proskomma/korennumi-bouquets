<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:output method="text"/>

    <xsl:template match="key">
        <xsl:value-of select="normalize-space(.)"/>
        <xsl:text>&#9;</xsl:text>
    </xsl:template>

    <xsl:template match="printable">
        <xsl:value-of select="normalize-space(.)"/>
        <xsl:text>&#9;</xsl:text>
    </xsl:template>

    <xsl:template match="gloss[@lang='en']">
        <xsl:value-of select="normalize-space(.)"/>
        <xsl:text>&#10;</xsl:text>
    </xsl:template>

    <xsl:template match="@*|node()">
        <xsl:apply-templates select="@*|node()"/>
    </xsl:template>

</xsl:stylesheet>
