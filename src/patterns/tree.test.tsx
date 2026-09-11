import { describe, expect, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Archive, Folder, Inbox, Settings } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import type { NavLinkRender } from './nav-link';
import {
  Tree,
  type TreeItem,
  type TreeLinkRender,
  type TreeReorder,
} from './tree';

/**
 * FEAT-20260911-002 — the WAI-ARIA `tree` keyboard contract, as a test.
 *
 * `V2` says it in as many words: keyboard tree behaviour is a specification,
 * not an opinion, and the pull request body is not where a specification
 * passes. Every rule the APG states for a single-select tree is a `test` here,
 * and the arrow rules run twice — once with reorder off and once with it on —
 * because the drag layer is where the pattern usually breaks.
 */

const ITEMS: TreeItem[] = [
  { id: 'inbox', label: 'Inbox', icon: Inbox, href: '/inbox' },
  {
    id: 'projects',
    label: 'Projects',
    icon: Folder,
    children: [
      {
        id: 'atlas',
        label: 'Atlas',
        children: [{ id: 'atlas-notes', label: 'Atlas notes', href: '/atlas/notes' }],
      },
      { id: 'calendar', label: 'Calendar sync', href: '/calendar' },
      { id: 'compass', label: 'Compass', href: '/compass' },
    ],
  },
  {
    id: 'archive',
    label: 'Archive',
    icon: Archive,
    children: [{ id: 'old', label: 'Old plans', href: '/archive/old' }],
  },
  { id: 'settings', label: 'Settings', icon: Settings },
];

/** The anchor a consumer would render, minus the navigation. */
function makeLink(followed: string[]): TreeLinkRender {
  return ({ href, className, children, ...rest }) => (
    <a
      href={href}
      className={className}
      onClick={(event) => {
        event.preventDefault();
        followed.push(href);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

interface HarnessProps {
  expanded?: string[];
  selected?: string | null;
  enableReorder?: boolean;
  onReorder?: (move: TreeReorder) => void;
  followed?: string[];
  onExpanded?: (ids: string[]) => void;
  onSelected?: (id: string) => void;
  renderActions?: (item: TreeItem) => ReactNode;
  items?: TreeItem[];
}

/** Expansion and selection are controlled, so the test owns them the way an application would. */
function Harness({
  expanded: initialExpanded = ['projects', 'atlas'],
  selected: initialSelected = null,
  enableReorder,
  onReorder,
  followed = [],
  onExpanded,
  onSelected,
  renderActions,
  items = ITEMS,
}: HarnessProps) {
  const [expanded, setExpanded] = useState(initialExpanded);
  const [selected, setSelected] = useState<string | null>(initialSelected);
  return (
    <>
      <button type="button">before</button>
      <Tree
        aria-label="Workspace"
        items={items}
        expandedIds={expanded}
        onExpandedChange={(ids) => {
          onExpanded?.(ids);
          setExpanded(ids);
        }}
        selectedId={selected}
        onSelectedChange={(id) => {
          onSelected?.(id);
          setSelected(id);
        }}
        link={makeLink(followed)}
        enableReorder={enableReorder}
        onReorder={onReorder}
        renderActions={renderActions}
      />
      <button type="button">after</button>
    </>
  );
}

const tree = () => screen.getByRole('tree', { name: 'Workspace' });
const row = (name: string) => screen.getByRole('treeitem', { name });
const names = () =>
  screen
    .getAllByRole('treeitem')
    .map((el) => document.getElementById(el.getAttribute('aria-labelledby') ?? '')?.textContent);

/**
 * Testing Library cannot press a real Tab — there is no user-event here and
 * happy-dom has no sequential focus navigation — so "one tab stop" is asserted
 * as the thing Tab reads: exactly one element inside the tree with a
 * non-negative `tabIndex`.
 */
const tabbables = (root: Element = tree()) =>
  [...root.querySelectorAll<HTMLElement>('*')].filter((el) => el.tabIndex >= 0);

const key = (el: Element, k: string) => fireEvent.keyDown(el, { key: k });
/** A row records that it has focus, which is a state update, which is `act`. */
const focus = (el: HTMLElement) => act(() => el.focus());

describe('Tree', () => {
  describe('the markup', () => {
    test('is a tree of treeitems, each named by its label alone', () => {
      render(<Harness />);

      expect(tree()).toBeDefined();
      expect(names()).toEqual([
        'Inbox',
        'Projects',
        'Atlas',
        'Atlas notes',
        'Calendar sync',
        'Compass',
        'Archive',
        'Settings',
      ]);
      // A parent named from its content would be "Projects Atlas Atlas notes
      // Calendar sync Compass"; `aria-labelledby` keeps it to the label.
      expect(row('Projects')).toBeDefined();
      expect(screen.queryByRole('treeitem', { name: /Projects Atlas/ })).toBeNull();
    });

    test('levels, set sizes and positions are stated', () => {
      render(<Harness />);

      expect(row('Inbox').getAttribute('aria-level')).toBe('1');
      expect(row('Atlas').getAttribute('aria-level')).toBe('2');
      expect(row('Atlas notes').getAttribute('aria-level')).toBe('3');
      expect(row('Calendar sync').getAttribute('aria-setsize')).toBe('3');
      expect(row('Calendar sync').getAttribute('aria-posinset')).toBe('2');
    });

    test('only a parent carries `aria-expanded`, and only an open one owns a group', () => {
      render(<Harness />);

      expect(row('Inbox').getAttribute('aria-expanded')).toBeNull();
      expect(row('Projects').getAttribute('aria-expanded')).toBe('true');
      expect(row('Archive').getAttribute('aria-expanded')).toBe('false');

      const owned = row('Projects').getAttribute('aria-owns') ?? '';
      const group = document.getElementById(owned);
      expect(group?.getAttribute('role')).toBe('group');
      expect(group?.querySelectorAll('[role="treeitem"]')).toHaveLength(4);
      expect(row('Archive').getAttribute('aria-owns')).toBeNull();
    });

    test('a closed parent renders no children at all', () => {
      render(<Harness />);
      expect(screen.queryByRole('treeitem', { name: 'Old plans' })).toBeNull();
    });

    test('a row is `--size-nav` tall and never a height of its own', () => {
      render(<Harness />);
      const classes = row('Inbox').className.split(' ');
      expect(classes).toContain('h-(--size-nav)');
      expect(classes.some((c) => /^h-\d/.test(c))).toBe(false);
    });

    test('the selected row says so, and its anchor is the current page', () => {
      render(<Harness selected="compass" />);

      expect(row('Compass').getAttribute('aria-selected')).toBe('true');
      expect(row('Inbox').getAttribute('aria-selected')).toBe('false');
      expect(
        row('Compass').querySelector('a')?.getAttribute('aria-current'),
      ).toBe('page');
      expect(row('Inbox').querySelector('a')?.getAttribute('aria-current')).toBeNull();
      // The tint is the accent's soft on the desk and the hover fill elsewhere.
      expect(row('Compass').className).toContain(
        'bg-[var(--color-accent-soft,var(--color-hover))]',
      );
    });
  });

  describe('one tab stop', () => {
    test('exactly one treeitem is in the tab order, and every anchor is out of it', () => {
      render(<Harness />);

      const stops = tabbables();
      expect(stops).toHaveLength(1);
      expect(stops[0]).toBe(row('Inbox'));
      for (const anchor of tree().querySelectorAll('a')) {
        expect(anchor.tabIndex).toBe(-1);
      }
    });

    test('the stop is the selected row when it is visible', () => {
      render(<Harness selected="calendar" />);
      expect(tabbables()).toEqual([row('Calendar sync')]);
    });

    test('a selected row under a closed parent does not take the stop', () => {
      render(<Harness selected="old" />);
      expect(tabbables()).toEqual([row('Inbox')]);
    });

    test('the stop follows focus, so leaving and returning lands where the person was', () => {
      render(<Harness />);

      focus(row('Inbox'));
      key(row('Inbox'), 'ArrowDown');
      key(row('Projects'), 'ArrowDown');
      expect(document.activeElement).toBe(row('Atlas'));

      focus(screen.getByRole('button', { name: 'after' }));
      expect(tabbables()).toEqual([row('Atlas')]);
    });

    test('a `NavLinkRender` that spreads its rest props satisfies `link`', () => {
      // Compile-time: the shell patterns' link type is assignable to the
      // tree's as long as `tabIndex` reaches the anchor through the rest.
      const link: NavLinkRender = ({ href, className, children, ...rest }) => (
        <a href={href} className={className} {...rest}>
          {children}
        </a>
      );
      render(
        <Tree
          aria-label="Workspace"
          items={ITEMS}
          expandedIds={[]}
          onExpandedChange={() => {}}
          selectedId={null}
          onSelectedChange={() => {}}
          link={link}
        />,
      );
      expect(row('Inbox').querySelector('a')?.tabIndex).toBe(-1);
    });
  });

  /**
   * The arrow rules, as the APG states them for a single-select tree. Run
   * twice — see the bottom of the file — because a drag layer that reads the
   * same events is where these usually break.
   */
  function arrowContract(enableReorder: boolean) {
    test('Down and Up walk the visible rows and stop at the ends', () => {
      render(<Harness enableReorder={enableReorder} />);

      focus(row('Inbox'));
      key(row('Inbox'), 'ArrowUp');
      expect(document.activeElement).toBe(row('Inbox'));

      key(row('Inbox'), 'ArrowDown');
      expect(document.activeElement).toBe(row('Projects'));
      key(row('Projects'), 'ArrowDown');
      expect(document.activeElement).toBe(row('Atlas'));
      key(row('Atlas'), 'ArrowDown');
      expect(document.activeElement).toBe(row('Atlas notes'));

      key(row('Atlas notes'), 'ArrowUp');
      expect(document.activeElement).toBe(row('Atlas'));

      focus(row('Settings'));
      key(row('Settings'), 'ArrowDown');
      expect(document.activeElement).toBe(row('Settings'));
    });

    test('Right opens a closed parent, then moves into it, and does nothing on a leaf', () => {
      const opened: string[][] = [];
      render(
        <Harness
          enableReorder={enableReorder}
          expanded={[]}
          onExpanded={(ids) => opened.push(ids)}
        />,
      );

      focus(row('Projects'));
      key(row('Projects'), 'ArrowRight');
      expect(opened).toEqual([['projects']]);
      expect(document.activeElement).toBe(row('Projects'));
      expect(row('Projects').getAttribute('aria-expanded')).toBe('true');

      key(row('Projects'), 'ArrowRight');
      expect(document.activeElement).toBe(row('Atlas'));
      expect(opened).toHaveLength(1);

      focus(row('Inbox'));
      key(row('Inbox'), 'ArrowRight');
      expect(document.activeElement).toBe(row('Inbox'));
      expect(opened).toHaveLength(1);
    });

    test('Left closes an open parent, moves a child to its parent, and does nothing at a closed root', () => {
      const opened: string[][] = [];
      render(
        <Harness
          enableReorder={enableReorder}
          onExpanded={(ids) => opened.push(ids)}
        />,
      );

      focus(row('Atlas notes'));
      key(row('Atlas notes'), 'ArrowLeft');
      expect(document.activeElement).toBe(row('Atlas'));
      expect(opened).toHaveLength(0);

      key(row('Atlas'), 'ArrowLeft');
      expect(opened).toEqual([['projects']]);
      expect(document.activeElement).toBe(row('Atlas'));
      expect(screen.queryByRole('treeitem', { name: 'Atlas notes' })).toBeNull();

      focus(row('Archive'));
      key(row('Archive'), 'ArrowLeft');
      expect(document.activeElement).toBe(row('Archive'));
      expect(opened).toHaveLength(1);
    });

    test('Home and End jump to the first and last visible row', () => {
      render(<Harness enableReorder={enableReorder} />);

      focus(row('Atlas'));
      key(row('Atlas'), 'End');
      expect(document.activeElement).toBe(row('Settings'));
      key(row('Settings'), 'Home');
      expect(document.activeElement).toBe(row('Inbox'));
    });

    test('the arrows are consumed, so a scrolling panel behind the tree does not move', () => {
      render(<Harness enableReorder={enableReorder} />);
      focus(row('Inbox'));
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        cancelable: true,
      });
      act(() => {
        row('Inbox').dispatchEvent(event);
      });
      expect(event.defaultPrevented).toBe(true);
    });
  }

  describe('the arrows', () => arrowContract(false));

  describe('type-ahead', () => {
    test('type-ahead moves the roving stop to the next row starting with the character', () => {
      const selected: string[] = [];
      render(<Harness onSelected={(id) => selected.push(id)} />);

      focus(row('Inbox'));
      key(row('Inbox'), 'a');
      expect(document.activeElement).toBe(row('Atlas'));
      // Focus, not selection: an `href` row that selected on every keystroke
      // would navigate on every keystroke.
      expect(selected).toEqual([]);
      expect(tabbables()).toEqual([row('Atlas')]);
    });

    test('the same character again cycles, and wraps', () => {
      render(<Harness />);

      focus(row('Inbox'));
      key(row('Inbox'), 'a');
      expect(document.activeElement).toBe(row('Atlas'));
      key(row('Atlas'), 'a');
      expect(document.activeElement).toBe(row('Atlas notes'));
      key(row('Atlas notes'), 'a');
      expect(document.activeElement).toBe(row('Archive'));
      key(row('Archive'), 'a');
      expect(document.activeElement).toBe(row('Atlas'));
    });

    test('several characters in quick succession are a prefix', () => {
      render(<Harness />);

      focus(row('Inbox'));
      key(row('Inbox'), 'c');
      expect(document.activeElement).toBe(row('Calendar sync'));
      // "co" — from the current row, so it leaves Calendar for Compass.
      key(row('Calendar sync'), 'o');
      expect(document.activeElement).toBe(row('Compass'));
    });

    test('a modifier chord is not type-ahead', () => {
      render(<Harness />);
      focus(row('Inbox'));
      fireEvent.keyDown(row('Inbox'), { key: 'a', ctrlKey: true });
      expect(document.activeElement).toBe(row('Inbox'));
    });

    test('`*` opens every parent among the siblings', () => {
      const opened: string[][] = [];
      render(<Harness expanded={[]} onExpanded={(ids) => opened.push(ids)} />);

      focus(row('Inbox'));
      key(row('Inbox'), '*');
      expect(opened).toHaveLength(1);
      expect([...opened[0]].sort()).toEqual(['archive', 'projects']);
      expect(screen.getByRole('treeitem', { name: 'Old plans' })).toBeDefined();
    });
  });

  describe('activation', () => {
    test('Enter selects and follows the anchor; Space selects and stays', () => {
      const followed: string[] = [];
      const selected: string[] = [];
      render(
        <Harness followed={followed} onSelected={(id) => selected.push(id)} />,
      );

      focus(row('Calendar sync'));
      key(row('Calendar sync'), 'Enter');
      expect(selected).toEqual(['calendar']);
      expect(followed).toEqual(['/calendar']);

      key(row('Calendar sync'), ' ');
      expect(selected).toEqual(['calendar', 'calendar']);
      expect(followed).toEqual(['/calendar']);
    });

    test('Enter on a row without an anchor selects', () => {
      const followed: string[] = [];
      const selected: string[] = [];
      render(
        <Harness followed={followed} onSelected={(id) => selected.push(id)} />,
      );
      focus(row('Settings'));
      key(row('Settings'), 'Enter');
      expect(selected).toEqual(['settings']);
      expect(followed).toEqual([]);
    });

    test('Enter on an open parent follows its own anchor, not its first child', () => {
      const followed: string[] = [];
      const items: TreeItem[] = [
        {
          id: 'docs',
          label: 'Docs',
          href: '/docs',
          children: [{ id: 'intro', label: 'Intro', href: '/docs/intro' }],
        },
      ];
      render(<Harness items={items} expanded={['docs']} followed={followed} />);
      focus(row('Docs'));
      key(row('Docs'), 'Enter');
      expect(followed).toEqual(['/docs']);
    });

    test('a click on the label selects and takes the stop; a click on the chevron only toggles', () => {
      const selected: string[] = [];
      const opened: string[][] = [];
      render(
        <Harness
          onSelected={(id) => selected.push(id)}
          onExpanded={(ids) => opened.push(ids)}
        />,
      );

      fireEvent.click(row('Compass').querySelector('a') as Element);
      expect(selected).toEqual(['compass']);
      expect(document.activeElement).toBe(row('Compass'));

      const chevron = row('Projects').querySelector('[data-tree-chevron]') as Element;
      fireEvent.click(chevron.firstElementChild as Element);
      expect(opened).toEqual([['atlas']]);
      expect(selected).toEqual(['compass']);
      expect(screen.queryByRole('treeitem', { name: 'Compass' })).toBeNull();
    });
  });

  describe('the actions slot', () => {
    const actions = (item: TreeItem) => (
      <>
        <button type="button">Rename {item.label}</button>
        <button type="button">Delete {item.label}</button>
      </>
    );

    test('is rendered once per row with that row', () => {
      render(<Harness renderActions={actions} />);
      expect(screen.getByRole('button', { name: 'Rename Atlas notes' })).toBeDefined();
      expect(screen.getAllByRole('button', { name: /^Delete / })).toHaveLength(8);
    });

    test('a click inside it is not a selection', () => {
      const selected: string[] = [];
      render(
        <Harness renderActions={actions} onSelected={(id) => selected.push(id)} />,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Rename Inbox' }));
      expect(selected).toEqual([]);
    });

    test('a key inside it is not a tree key', () => {
      render(<Harness renderActions={actions} />);
      const rename = screen.getByRole('button', { name: 'Rename Inbox' });
      focus(rename);
      key(rename, 'ArrowDown');
      expect(document.activeElement).toBe(rename);
    });

    /**
     * The roving stop covers the slot: every button stays in the DOM and in
     * the accessibility tree, and only the row that holds the stop keeps its
     * buttons in the tab order. Tab from the focused row reaches its actions
     * and then leaves the tree.
     */
    test('only the row holding the stop keeps its actions in the tab order, and it moves with the stop', () => {
      render(<Harness renderActions={actions} />);

      const stops = tabbables();
      expect(stops.map((el) => el.textContent)).toEqual([
        row('Inbox').textContent,
        'Rename Inbox',
        'Delete Inbox',
      ]);
      expect(stops[0]).toBe(row('Inbox'));
      // Still in the DOM, still buttons, just not stops.
      expect(screen.getAllByRole('button', { name: /^Rename / })).toHaveLength(8);

      focus(row('Inbox'));
      key(row('Inbox'), 'ArrowDown');

      const moved = tabbables();
      expect(moved[0]).toBe(row('Projects'));
      expect(moved.slice(1).map((el) => el.textContent)).toEqual([
        'Rename Projects',
        'Delete Projects',
      ]);
      // The row that lost the stop has its buttons back exactly as rendered:
      // no `tabindex` attribute at all, which is what the slot gave them.
      expect(
        screen.getByRole('button', { name: 'Rename Inbox' }).getAttribute('tabindex'),
      ).toBe('-1');
      expect(
        screen.getByRole('button', { name: 'Rename Projects' }).getAttribute('tabindex'),
      ).toBeNull();
    });
  });

  describe('reorder', () => {
    /** happy-dom lays nothing out; the row states its own box for the pointer test. */
    const box = (el: Element, top: number, height: number) => {
      (el as HTMLElement).getBoundingClientRect = () =>
        ({ top, height, bottom: top + height, left: 0, right: 0, width: 0, x: 0, y: top }) as DOMRect;
    };

    /**
     * happy-dom has no `DragEvent`, and the `Event` Testing Library falls back
     * to carries no `clientY`. The drag events are mouse events in every
     * browser, so a `MouseEvent` of the right name is what the row reads.
     */
    const dragEvent = (type: string, clientY: number) =>
      new MouseEvent(type, { bubbles: true, cancelable: true, clientY });
    const drag = (from: Element, to: Element, clientY: number) => {
      fireEvent(from, dragEvent('dragstart', 0));
      fireEvent(to, dragEvent('dragover', clientY));
      fireEvent(to, dragEvent('drop', clientY));
      fireEvent(from, dragEvent('dragend', 0));
    };

    test('ships off: rows are not draggable and a drop reports nothing', () => {
      const moves: TreeReorder[] = [];
      render(<Harness onReorder={(m) => moves.push(m)} />);

      for (const item of screen.getAllByRole('treeitem')) {
        expect(item.getAttribute('draggable')).toBeNull();
      }
      drag(row('Inbox'), row('Settings'), 0);
      expect(moves).toEqual([]);
    });

    test('on: rows are draggable, and a drop lands after or before by pointer half', () => {
      const moves: TreeReorder[] = [];
      render(<Harness enableReorder onReorder={(m) => moves.push(m)} />);

      expect(row('Inbox').getAttribute('draggable')).toBe('true');

      box(row('Archive'), 100, 28);
      // Lower half: after Archive, at the root — index 2 rather than 3,
      // because Inbox vacates index 0 before the position is counted.
      drag(row('Inbox'), row('Archive'), 120);
      expect(moves).toEqual([{ id: 'inbox', parentId: null, index: 2 }]);

      // Upper half: before Compass, among Projects' children.
      box(row('Compass'), 100, 28);
      drag(row('Settings'), row('Compass'), 104);
      expect(moves[1]).toEqual({ id: 'settings', parentId: 'projects', index: 2 });
    });

    test('a row cannot be dropped onto itself or into its own subtree', () => {
      const moves: TreeReorder[] = [];
      render(<Harness enableReorder onReorder={(m) => moves.push(m)} />);

      drag(row('Projects'), row('Atlas notes'), 0);
      drag(row('Projects'), row('Projects'), 0);
      expect(moves).toEqual([]);
    });

    test('a drop that changes nothing is not reported', () => {
      const moves: TreeReorder[] = [];
      render(<Harness enableReorder onReorder={(m) => moves.push(m)} />);

      // After Atlas is where Calendar sync already is.
      box(row('Atlas'), 100, 28);
      drag(row('Calendar sync'), row('Atlas'), 120);
      expect(moves).toEqual([]);
    });

    test('the drop marker is drawn on the row under the pointer, and goes with the drag', () => {
      render(<Harness enableReorder />);

      box(row('Archive'), 100, 28);
      fireEvent(row('Inbox'), dragEvent('dragstart', 0));
      fireEvent(row('Archive'), dragEvent('dragover', 104));
      const marker = row('Archive').querySelector('[aria-hidden="true"].absolute');
      expect(marker?.className).toContain('-top-px');
      fireEvent(row('Archive'), dragEvent('dragover', 120));
      expect(
        row('Archive').querySelector('[aria-hidden="true"].absolute')?.className,
      ).toContain('-bottom-px');
      fireEvent(row('Inbox'), dragEvent('dragend', 0));
      expect(row('Archive').querySelector('[aria-hidden="true"].absolute')).toBeNull();
    });

    describe('the keyboard contract, with the drag layer on', () => arrowContract(true));
  });
});
