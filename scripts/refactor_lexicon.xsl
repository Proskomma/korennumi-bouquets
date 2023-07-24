<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:output method="xml" indent="yes"/>
    <xsl:strip-space elements="*"/>

    <xsl:variable name="keys" select="document('../dataSources/grc/uniqueLemmas.xml')"/>

    <xsl:template match="/entries">
        <entries>
            <xsl:for-each select="entry">
                <xsl:variable name="thisEntry" select="."/>
                <xsl:if test="$keys/keys/key[.=normalize-space(substring-before($thisEntry/@n, '|'))]">
                    <xsl:apply-templates select="$thisEntry"/>
                </xsl:if>
            </xsl:for-each>
        </entries>
    </xsl:template>

    <xsl:template match="@n">
        <key>
            <xsl:value-of select="normalize-space(substring-before(., '|'))"/>
        </key>
        <strongNo>
            <xsl:value-of select="normalize-space(substring-after(., '|'))"/>
        </strongNo>
    </xsl:template>

    <xsl:template match="def[@role='full']">
    </xsl:template>

    <xsl:template match="orth">
        <printable>
            <xsl:value-of select="."/>
        </printable>
    </xsl:template>

    <xsl:template match="def[@role='brief']">
        <gloss lang="en">
            <xsl:value-of select="."/>
        </gloss>
        <gloss lang="fr"></gloss>
        <gloss lang="es"></gloss>
    </xsl:template>

    <xsl:template match="@*|node()">
        <xsl:copy>
            <xsl:apply-templates select="@*|node()"/>
        </xsl:copy>
    </xsl:template>

</xsl:stylesheet>
