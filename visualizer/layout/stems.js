'use strict'

const { radiusFromCircumference } = require('./line-coordinates.js')
const { validateNumber } = require('../validation.js')

function getNodeAncestorIds (parent) {
  return parent ? [...parent.stem.ancestors.ids, parent.id] : []
}

class Stem {
  constructor (layout, layoutNode) {
    this.layout = layout

    // Ancestor stem stats must be calculated before descendent stem stats
    const parent = layoutNode.parent
    if (parent && !parent.stem) {
      parent.stem = new Stem(layout, parent)
    }

    this.ancestors = {
      totalBetween: 0,
      totalDiameter: 0,
      ids: getNodeAncestorIds(parent)
    }
    this.leaves = {
      ids: []
    }
    this.longestLeaf = null
    this.raw = {
      ownBetween: layoutNode.getBetweenTime(),
      ownDiameter: radiusFromCircumference(layoutNode.getWithinTime()) * 2
    }

    this.shortcutsInStem = layoutNode.node.constructor.name === 'ShortcutNode' ? 1 : 0

    for (const ancestorId of this.ancestors.ids) {
      const ancestor = layout.layoutNodes.get(ancestorId)
      if (!ancestor) console.log({ ancestorId })
      const ancestorStem = ancestor.stem

      if (ancestor.node.constructor.name === 'ShortcutNode') this.shortcutsInStem++

      this.ancestors.totalBetween += ancestorStem.raw.ownBetween
      this.ancestors.totalDiameter += ancestorStem.raw.ownDiameter
      if (!layoutNode.children.length) {
        ancestorStem.leaves.ids.push(layoutNode.id)
        if (!ancestorStem.longestLeaf) {
          ancestorStem.longestLeaf = ancestorStem.longestLeaf || layoutNode
        } else {
          ancestorStem.longestLeaf = layoutNode.getTotalTime() > ancestorStem.longestLeaf.getTotalTime() ? layoutNode : ancestorStem.longestLeaf
        }
      }
    }
    this.update()
  }
  update () {
    if (!this.lengths) {
      const {
        labelMinimumSpace,
        lineWidth,
        shortcutLength
      } = this.layout.settings

      const absolute = ((labelMinimumSpace * 2) + lineWidth) * this.ancestors.ids.length + shortcutLength * this.shortcutsInStem
      const scalable = this.ancestors.totalBetween + this.ancestors.totalDiameter + this.raw.ownBetween + this.raw.ownDiameter
      this.lengths = {
        absolute: validateNumber(absolute, this.getValidationMessage()),
        scalable: validateNumber(scalable, this.getValidationMessage()),
        rawTotal: absolute + scalable
      }
    }
    if (this.layout.scale.prescaleFactor) {
      this.lengths.prescaledTotal = this.lengths.absolute + (this.lengths.scalable * this.layout.scale.prescaleFactor)
    }
    if (this.layout.scale.scaleFactor) {
      const { settings, scale } = this.layout
      this.scaled = {
        ownBetween: (settings.labelMinimumSpace * 2) + settings.lineWidth + scale.getLineLength(this.raw.ownBetween),
        ownDiameter: scale.getLineLength(this.raw.ownDiameter)
      }
      this.lengths.scaledTotal = this.lengths.absolute + (this.lengths.scalable * this.layout.scale.scaleFactor)
    }
  }
  getValidationMessage () {
    return `for stem with:
    ancestor ids [${this.ancestors.ids.join(', ')}], length ${this.ancestors.ids.length});
    leaves [${this.leaves.ids.join(', ')}], length ${this.leaves.ids.length};
    `
  }
  pickMostAccurateTotal () {
    const { rawTotal, prescaledTotal, scaledTotal } = this.lengths
    return scaledTotal || prescaledTotal || rawTotal
  }
  static pickLeavesByLongest (layoutNodes) {
    const byLongest = (leafA, leafB) => leafB.stem.pickMostAccurateTotal() - leafA.stem.pickMostAccurateTotal()
    const byLeafOnly = layoutNode => !layoutNode.children.length
    return [...layoutNodes.values()].filter(byLeafOnly).sort(byLongest)
  }
}

module.exports = Stem
